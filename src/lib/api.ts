/** API client for IACMS gateway (`VITE_API_URL`, default http://localhost:3000). */

import { authBus } from "./authEvents";

const ACCESS_KEY = "iacms.accessToken";
const REFRESH_KEY = "iacms.refreshToken";

export function getApiBase(): string {
  const raw = import.meta.env.VITE_API_URL;
  const base = (typeof raw === "string" ? raw : "").replace(/\/$/, "");
  if (!base) {
    return "http://localhost:3000";
  }
  return base;
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, message: string, body: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

function extractErrorMessage(body: unknown): string {
  if (body && typeof body === "object") {
    const o = body as Record<string, unknown>;
    const err = o.error;
    if (err && typeof err === "object") {
      const m = (err as { message?: string }).message;
      if (typeof m === "string" && m) return m;
    }
    const msg = o.message;
    if (typeof msg === "string" && msg) return msg;
  }
  return "Request failed";
}

async function parseResponse(res: Response): Promise<unknown> {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { raw: text };
  }
}

export function getStoredAccessToken(): string | null {
  try {
    return localStorage.getItem(ACCESS_KEY);
  } catch {
    return null;
  }
}

/** JWTs from `session/login` or `auth/register` — required for gateway `/api/v1/auth/profile`, etc. */
export function setStoredTokens(access: string | null, refresh: string | null): void {
  try {
    if (access) localStorage.setItem(ACCESS_KEY, access);
    else localStorage.removeItem(ACCESS_KEY);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
    else localStorage.removeItem(REFRESH_KEY);
  } catch {
    /* ignore */
  }
}

export function clearStoredTokens(): void {
  setStoredTokens(null, null);
}

/** Normalize session-login vs register response shapes. */
export function persistAuthTokensFromResponse(data: unknown): void {
  if (!data || typeof data !== "object") return;
  const o = data as Record<string, unknown>;
  const nested = o.tokens;
  if (nested && typeof nested === "object") {
    const t = nested as Record<string, unknown>;
    const a = t.accessToken;
    const r = t.refreshToken;
    if (typeof a === "string") {
      setStoredTokens(a, typeof r === "string" ? r : null);
      return;
    }
  }
  const a = o.accessToken;
  const r = o.refreshToken;
  if (typeof a === "string") {
    setStoredTokens(a, typeof r === "string" ? r : null);
  }
}

function getRefreshToken(): string | null {
  try {
    return localStorage.getItem(REFRESH_KEY);
  } catch {
    return null;
  }
}

async function refreshAccessToken(): Promise<boolean> {
  const rt = getRefreshToken();
  if (!rt) return false;
  try {
    const base = getApiBase();
    const res = await fetch(`${base}/api/v1/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken: rt }),
    });
    const data = (await res.json().catch(() => null)) as { accessToken?: string; refreshToken?: string } | null;
    if (!res.ok || !data?.accessToken) return false;
    setStoredTokens(data.accessToken, data.refreshToken ?? rt);
    return true;
  } catch {
    return false;
  }
}

/** Public endpoints whose 401s must not trigger a refresh + redirect. */
function isPublicAuthPath(path: string): boolean {
  return (
    path.includes("/auth/login") ||
    path.includes("/auth/register") ||
    path.includes("/session/login") ||
    path.includes("/session/logout") ||
    path.includes("/auth/refresh") ||
    path.includes("/auth/forgot-password") ||
    path.includes("/auth/reset-password") ||
    path.includes("/auth/verify-email") ||
    path.includes("/tenants/register") ||
    path.includes("/tenants/validate/") ||
    path.includes("/session/status")
  );
}

/** Gateway fetch with session cookies + optional Bearer JWT. Handles refresh-on-401 globally. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const base = getApiBase();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const buildHeaders = (): Headers => {
    const h = new Headers(init.headers);
    if (!h.has("Content-Type") && init.body != null && !(init.body instanceof FormData)) {
      h.set("Content-Type", "application/json");
    }
    const token = getStoredAccessToken();
    if (token && !h.has("Authorization")) {
      h.set("Authorization", `Bearer ${token}`);
    }
    return h;
  };

  let res = await fetch(url, { credentials: "include", ...init, headers: buildHeaders() });

  if (res.status === 401 && !isPublicAuthPath(path)) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      res = await fetch(url, { credentials: "include", ...init, headers: buildHeaders() });
    } else if (getStoredAccessToken() || getRefreshToken()) {
      // Had a token, refresh failed → session is gone.
      authBus.emit("expired");
    }
  }

  if (res.status === 403) {
    authBus.emit("forbidden");
  }

  const data = await parseResponse(res);
  if (!res.ok) {
    throw new ApiError(res.status, extractErrorMessage(data), data);
  }
  return data;
}

/**
 * Optional second argument for the JSON helpers. `signal` lets callers tie a
 * request to an `AbortController` so unmount/teardown cancels the in-flight
 * request instead of completing it pointlessly.
 */
export type ApiCallOptions = { signal?: AbortSignal };

export async function apiGet(path: string, opts: ApiCallOptions = {}): Promise<unknown> {
  return apiFetch(path, { method: "GET", signal: opts.signal });
}

export async function apiPost(path: string, json: unknown, opts: ApiCallOptions = {}): Promise<unknown> {
  return apiFetch(path, { method: "POST", body: JSON.stringify(json), signal: opts.signal });
}

export async function apiPatch(path: string, json: unknown, opts: ApiCallOptions = {}): Promise<unknown> {
  return apiFetch(path, { method: "PATCH", body: JSON.stringify(json), signal: opts.signal });
}

export async function apiPut(path: string, json: unknown, opts: ApiCallOptions = {}): Promise<unknown> {
  return apiFetch(path, { method: "PUT", body: JSON.stringify(json), signal: opts.signal });
}

export async function apiDelete(path: string, opts: ApiCallOptions = {}): Promise<unknown> {
  return apiFetch(path, { method: "DELETE", signal: opts.signal });
}

/** True when an error came from a cancelled fetch (caller can ignore). */
export function isAbortError(e: unknown): boolean {
  return (
    e instanceof DOMException && e.name === "AbortError" ||
    (e instanceof Error && e.name === "AbortError")
  );
}
