/**
 * File Management Service (FMS) client — uploads, chunked uploads, polling, download.
 */

import {
  ApiError,
  apiDelete,
  apiFetch,
  apiGet,
  apiPost,
  getApiBase,
  getStoredAccessToken,
  persistAuthTokensFromResponse,
} from "@/lib/api";
import { authBus } from "@/lib/authEvents";

export const FMS_CASE_SERVICE = "case-management";
export const FMS_MODULE_EVIDENCE = "evidence";
export const FMS_MODULE_LETTER = "letter";

/** Files larger than this use the chunked upload API. */
export const CHUNK_THRESHOLD_BYTES = 20 * 1024 * 1024;
/** Default chunk size for resumable uploads (~5 MB). */
export const CHUNK_SIZE_BYTES = 5 * 1024 * 1024;

export type FileStatus =
  | "PENDING"
  | "SCANNING"
  | "PROCESSING"
  | "AVAILABLE"
  | "FAILED"
  | "DELETED";

export type FmsFile = {
  id: string;
  service: string;
  module: string;
  ownerId: string;
  referenceId: string | null;
  originalName: string;
  mimeType: string;
  size: number;
  checksum: string;
  status: FileStatus;
  compressed: boolean;
  compressionType: string | null;
  thumbnails: Record<string, string> | null;
  metadata: Record<string, unknown> | null;
  versionOf: string | null;
  createdAt: string;
  updatedAt: string;
  url: string;
  downloadUrl: string;
};

const FMS_PATH_RE = /^fms:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;

/** Extract FMS file UUID from case attachment `filePath` (`fms:{uuid}`). */
export function parseFmsFileId(filePath: string | null | undefined): string | null {
  if (!filePath) return null;
  const m = FMS_PATH_RE.exec(filePath.trim());
  return m ? m[1] : null;
}

export function fmsFilePath(fileId: string): string {
  return `fms:${fileId}`;
}

export type UploadFileOpts = {
  file: File | Blob;
  service: string;
  module: string;
  referenceId?: string;
  compress?: boolean;
  /** Original filename when `file` is a Blob without a name. */
  filename?: string;
  signal?: AbortSignal;
};

function asFmsFile(data: unknown): FmsFile {
  if (!data || typeof data !== "object" || !("id" in data)) {
    throw new ApiError(500, "Invalid file response from FMS", data);
  }
  return data as FmsFile;
}

/** Authenticated fetch that returns a Blob (for download/view). */
async function fetchBlob(path: string, signal?: AbortSignal): Promise<Blob> {
  const base = getApiBase();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;

  const buildHeaders = (): Headers => {
    const h = new Headers();
    const token = getStoredAccessToken();
    if (token) h.set("Authorization", `Bearer ${token}`);
    return h;
  };

  let res = await fetch(url, { credentials: "include", headers: buildHeaders(), signal });

  if (res.status === 401) {
    const rt = (() => {
      try {
        return localStorage.getItem("iacms.refreshToken");
      } catch {
        return null;
      }
    })();
    if (!rt) {
      authBus.emit("expired");
      throw new ApiError(401, "Session expired", null);
    }
    try {
      const data = await apiPost("/api/v1/auth/refresh", { refreshToken: rt });
      persistAuthTokensFromResponse(data);
    } catch {
      authBus.emit("expired");
      throw new ApiError(401, "Session expired", null);
    }
    res = await fetch(url, { credentials: "include", headers: buildHeaders(), signal });
  }

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let body: unknown = text;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      /* keep text */
    }
    throw new ApiError(res.status, "File download failed", body);
  }

  return res.blob();
}

export async function uploadFile(opts: UploadFileOpts): Promise<FmsFile> {
  const { file, service, module, referenceId, compress, filename, signal } = opts;
  const fd = new FormData();
  fd.append("service", service);
  fd.append("module", module);
  if (referenceId) fd.append("referenceId", referenceId);
  if (compress != null) fd.append("compress", compress ? "true" : "false");

  const name =
    filename ||
    (file instanceof File && file.name ? file.name : "upload.bin");
  fd.append("file", file, name);

  const data = await apiFetch("/api/v1/files", { method: "POST", body: fd, signal });
  return asFmsFile(data);
}

export type ChunkProgress = {
  phase: "uploading" | "merging";
  receivedChunks: number;
  totalChunks: number;
};

/**
 * Chunked upload for large files. Returns the created File record (status PENDING).
 */
export async function uploadLargeFile(
  opts: UploadFileOpts & { onProgress?: (p: ChunkProgress) => void; chunkSize?: number },
): Promise<FmsFile> {
  const { file, service, module, referenceId, signal, onProgress } = opts;
  const chunkSize = opts.chunkSize ?? CHUNK_SIZE_BYTES;
  const totalSize = file.size;
  const totalChunks = Math.max(1, Math.ceil(totalSize / chunkSize));
  const originalName =
    opts.filename ||
    (file instanceof File && file.name ? file.name : "upload.bin");
  const mimeType =
    (file instanceof File && file.type) ||
    (file.type ? file.type : "application/octet-stream");

  const init = (await apiPost(
    "/api/v1/uploads/init",
    {
      service,
      module,
      ...(referenceId ? { referenceId } : {}),
      originalName,
      mimeType,
      totalSize,
      totalChunks,
      chunkSize,
    },
    { signal },
  )) as { uploadId: string };

  const uploadId = init.uploadId;

  for (let n = 1; n <= totalChunks; n++) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const start = (n - 1) * chunkSize;
    const end = Math.min(start + chunkSize, totalSize);
    const blob = file.slice(start, end);

    await apiFetch(`/api/v1/uploads/${encodeURIComponent(uploadId)}/chunks/${n}`, {
      method: "PUT",
      body: blob,
      headers: { "Content-Type": "application/octet-stream" },
      signal,
    });

    onProgress?.({ phase: "uploading", receivedChunks: n, totalChunks });
  }

  onProgress?.({ phase: "merging", receivedChunks: totalChunks, totalChunks });

  const complete = (await apiPost(
    `/api/v1/uploads/${encodeURIComponent(uploadId)}/complete`,
    {},
    { signal },
  )) as { fileId: string; status: string };

  return getFile(complete.fileId, signal);
}

/** Choose single vs chunked upload based on size. */
export async function uploadFileAuto(
  opts: UploadFileOpts & { onChunkProgress?: (p: ChunkProgress) => void },
): Promise<FmsFile> {
  if (opts.file.size > CHUNK_THRESHOLD_BYTES) {
    return uploadLargeFile({ ...opts, onProgress: opts.onChunkProgress });
  }
  return uploadFile(opts);
}

export async function getFile(fileId: string, signal?: AbortSignal): Promise<FmsFile> {
  const data = await apiGet(`/api/v1/files/${encodeURIComponent(fileId)}`, { signal });
  return asFmsFile(data);
}

export async function listFiles(query: {
  service?: string;
  module?: string;
  referenceId?: string;
  status?: FileStatus;
  page?: number;
  limit?: number;
  signal?: AbortSignal;
}): Promise<{ data: FmsFile[]; total: number; page: number; limit: number }> {
  const params = new URLSearchParams();
  if (query.service) params.set("service", query.service);
  if (query.module) params.set("module", query.module);
  if (query.referenceId) params.set("referenceId", query.referenceId);
  if (query.status) params.set("status", query.status);
  if (query.page) params.set("page", String(query.page));
  if (query.limit) params.set("limit", String(query.limit));
  const qs = params.toString();
  const data = (await apiGet(`/api/v1/files${qs ? `?${qs}` : ""}`, {
    signal: query.signal,
  })) as { data: FmsFile[]; total: number; page: number; limit: number };
  return data;
}

export async function deleteFile(fileId: string, signal?: AbortSignal): Promise<void> {
  await apiDelete(`/api/v1/files/${encodeURIComponent(fileId)}`, { signal });
}

export type WaitAvailableOpts = {
  signal?: AbortSignal;
  intervalMs?: number;
  timeoutMs?: number;
  onStatus?: (file: FmsFile) => void;
};

/**
 * Poll until file is AVAILABLE or FAILED, or timeout.
 */
export async function waitUntilAvailable(
  fileId: string,
  opts: WaitAvailableOpts = {},
): Promise<FmsFile> {
  const intervalMs = opts.intervalMs ?? 1500;
  const timeoutMs = opts.timeoutMs ?? 5 * 60 * 1000;
  const started = Date.now();

  while (true) {
    if (opts.signal?.aborted) throw new DOMException("Aborted", "AbortError");
    const file = await getFile(fileId, opts.signal);
    opts.onStatus?.(file);

    if (file.status === "AVAILABLE") return file;
    if (file.status === "FAILED" || file.status === "DELETED") {
      throw new ApiError(
        409,
        `File processing failed (status: ${file.status})`,
        file,
      );
    }
    if (Date.now() - started > timeoutMs) {
      throw new ApiError(408, "Timed out waiting for file to become available", file);
    }

    await new Promise<void>((resolve, reject) => {
      const t = window.setTimeout(resolve, intervalMs);
      opts.signal?.addEventListener(
        "abort",
        () => {
          window.clearTimeout(t);
          reject(new DOMException("Aborted", "AbortError"));
        },
        { once: true },
      );
    });
  }
}

/**
 * Full case-attachment upload: FMS upload → wait AVAILABLE → returns ready file.
 */
export async function uploadAndWaitAvailable(
  opts: UploadFileOpts & {
    onChunkProgress?: (p: ChunkProgress) => void;
    onStatus?: (file: FmsFile) => void;
    intervalMs?: number;
    timeoutMs?: number;
  },
): Promise<FmsFile> {
  const pending = await uploadFileAuto(opts);
  opts.onStatus?.(pending);
  if (pending.status === "AVAILABLE") return pending;
  return waitUntilAvailable(pending.id, {
    signal: opts.signal,
    onStatus: opts.onStatus,
    intervalMs: opts.intervalMs,
    timeoutMs: opts.timeoutMs,
  });
}

export async function downloadFileBlob(
  fileId: string,
  signal?: AbortSignal,
): Promise<Blob> {
  return fetchBlob(`/api/v1/files/${encodeURIComponent(fileId)}/download`, signal);
}

export async function viewFileBlob(
  fileId: string,
  signal?: AbortSignal,
): Promise<Blob> {
  return fetchBlob(`/api/v1/files/${encodeURIComponent(fileId)}/view`, signal);
}

/** Trigger a browser download of an FMS file. */
export async function downloadFile(
  fileId: string,
  filename: string,
  signal?: AbortSignal,
): Promise<void> {
  const blob = await downloadFileBlob(fileId, signal);
  const objectUrl = URL.createObjectURL(blob);
  try {
    const a = document.createElement("a");
    a.href = objectUrl;
    a.download = filename || "download";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** Open an FMS file in a new tab (inline view). Pre-opens window synchronously to bypass pop-up blockers. */
export async function openFileView(
  fileId: string,
  signal?: AbortSignal,
): Promise<void> {
  const popup = typeof window !== "undefined" ? window.open("about:blank", "_blank") : null;
  if (popup) {
    try {
      popup.document.write("<html><head><title>Loading Document...</title></head><body style='font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;background:#f8fafc;color:#1e293b;'><div style='text-align:center;'><h2>Loading Document...</h2><p style='color:#64748b;'>Please wait while the file is retrieved securely.</p></div></body></html>");
    } catch {
      /* ignore write errors */
    }
  }

  try {
    const blob = await viewFileBlob(fileId, signal);
    const objectUrl = URL.createObjectURL(blob);

    if (popup && !popup.closed) {
      popup.location.href = objectUrl;
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } else {
      const a = document.createElement("a");
      a.href = objectUrl;
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    }
  } catch (err) {
    if (popup && !popup.closed) {
      popup.close();
    }
    throw err;
  }
}
