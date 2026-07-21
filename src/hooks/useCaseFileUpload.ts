import { useCallback, useRef, useState } from "react";
import { ApiError, isAbortError } from "@/lib/api";
import {
  type ChunkProgress,
  type FmsFile,
  type FileStatus,
  FMS_CASE_SERVICE,
  FMS_MODULE_EVIDENCE,
  uploadAndWaitAvailable,
} from "@/lib/filesApi";

export type CaseFileUploadPhase =
  | "idle"
  | "uploading"
  | "processing"
  | "ready"
  | "error";

export type UseCaseFileUploadResult = {
  phase: CaseFileUploadPhase;
  status: FileStatus | null;
  chunkProgress: ChunkProgress | null;
  error: string | null;
  /** Upload file to FMS (case-management / evidence) and wait until AVAILABLE. */
  upload: (opts: {
    file: File;
    caseId: string;
    module?: string;
    compress?: boolean;
  }) => Promise<FmsFile>;
  reset: () => void;
};

/**
 * Case attachment upload helper — mirrors useWorkflow style (local state, abortable).
 */
export function useCaseFileUpload(): UseCaseFileUploadResult {
  const [phase, setPhase] = useState<CaseFileUploadPhase>("idle");
  const [status, setStatus] = useState<FileStatus | null>(null);
  const [chunkProgress, setChunkProgress] = useState<ChunkProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    setPhase("idle");
    setStatus(null);
    setChunkProgress(null);
    setError(null);
  }, []);

  const upload = useCallback(
    async (opts: {
      file: File;
      caseId: string;
      module?: string;
      compress?: boolean;
    }) => {
      abortRef.current?.abort();
      const ac = new AbortController();
      abortRef.current = ac;
      setError(null);
      setChunkProgress(null);
      setStatus(null);
      setPhase("uploading");

      try {
        const file = await uploadAndWaitAvailable({
          file: opts.file,
          service: FMS_CASE_SERVICE,
          module: opts.module ?? FMS_MODULE_EVIDENCE,
          referenceId: opts.caseId,
          compress: opts.compress,
          signal: ac.signal,
          onChunkProgress: (p) => {
            setChunkProgress(p);
            setPhase("uploading");
          },
          onStatus: (f) => {
            setStatus(f.status);
            if (f.status !== "AVAILABLE" && f.status !== "FAILED") {
              setPhase("processing");
            }
          },
        });
        setStatus(file.status);
        setPhase("ready");
        return file;
      } catch (e) {
        if (isAbortError(e)) {
          setPhase("idle");
          throw e;
        }
        const message =
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Upload failed";
        setError(message);
        setPhase("error");
        throw e;
      }
    },
    [],
  );

  return { phase, status, chunkProgress, error, upload, reset };
}
