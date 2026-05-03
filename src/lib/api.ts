/** API client for IACMS gateway (`VITE_API_URL`, default http://localhost:3000). */

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

/** Gateway fetch with session cookies + optional Bearer JWT for `/auth/*` upstream routes. */
export async function apiFetch(path: string, init: RequestInit = {}): Promise<unknown> {
  const base = getApiBase();
  const url = `${base}${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(init.headers);
  if (!headers.has("Content-Type") && init.body != null && !(init.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  const bearer = getStoredAccessToken();
  if (bearer && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${bearer}`);
  }

  let res = await fetch(url, {
    credentials: "include",
    ...init,
    headers,
  });

  if (res.status === 401 && bearer && path.includes("/auth/") && !path.includes("/auth/login") && !path.includes("/auth/register")) {
    const ok = await refreshAccessToken();
    if (ok) {
      const headers2 = new Headers(init.headers);
      if (!headers2.has("Content-Type") && init.body != null && !(init.body instanceof FormData)) {
        headers2.set("Content-Type", "application/json");
      }
      const b2 = getStoredAccessToken();
      if (b2) headers2.set("Authorization", `Bearer ${b2}`);
      res = await fetch(url, { credentials: "include", ...init, headers: headers2 });
    }
  }

  const data = await parseResponse(res);
  if (!res.ok) {
    throw new ApiError(res.status, extractErrorMessage(data), data);
  }
  return data;
}

export async function apiGet(path: string): Promise<unknown> {
  return apiFetch(path, { method: "GET" });
}

export async function apiPost(path: string, json: unknown): Promise<unknown> {
  return apiFetch(path, { method: "POST", body: JSON.stringify(json) });
}

export async function apiPatch(path: string, json: unknown): Promise<unknown> {
  return apiFetch(path, { method: "PATCH", body: JSON.stringify(json) });
}
