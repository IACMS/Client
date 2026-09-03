/**
 * Typed API client for the API Key Management endpoints.
 * All requests go through the standard `apiGet / apiPost / apiDelete` helpers
 * so cookies and error handling are consistent with the rest of the app.
 */

import { apiGet, apiPost, apiDelete } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

/**
 * A scope string assignable to an API key.
 * The canonical list is served dynamically by GET /api/v1/api-keys/scopes
 * so this type is kept intentionally broad — the backend is the source of truth.
 */
export type ApiKeyScope = string;

/**
 * Metadata about a single scope returned by the /scopes endpoint.
 * The backend only returns the raw scope string; human-readable labels and
 * descriptions are derived client-side via getScopeLabel / getScopeDescription.
 */
export interface ScopeMeta {
  value: ApiKeyScope;
  label: string;
  description: string;
}

export interface ApiKeyRecord {
  id: string;
  name: string;
  keyPrefix: string;
  scopes: ApiKeyScope[];
  isActive: boolean;
  expiresAt: string | null;
  lastUsedAt: string | null;
  createdAt: string;
  revokedAt: string | null;
}

export interface CreateApiKeyPayload {
  name: string;
  scopes: ApiKeyScope[];
  expiresAt?: string | null;
}

export interface CreateApiKeyResult {
  apiKey: ApiKeyRecord & { rawKey: string };
}

export interface RotateApiKeyResult {
  apiKey: Omit<ApiKeyRecord, "isActive" | "expiresAt" | "lastUsedAt" | "createdAt" | "revokedAt"> & {
    rawKey: string;
  };
}

// ── Scope label helpers ───────────────────────────────────────────────────────

/**
 * Derive a human-readable label from a scope string.
 * Falls back gracefully for unknown/future scopes.
 *
 * Examples:
 *   "cases:read"    → "Cases — Read"
 *   "cases:create"  → "Cases — Create"
 *   "*"             → "All Scopes (*)"
 */
export function getScopeLabel(scope: ApiKeyScope): string {
  if (scope === "*") return "All Scopes (*)";
  const [resource, action] = scope.split(":");
  if (!resource || !action) return scope;
  const res = resource.charAt(0).toUpperCase() + resource.slice(1);
  const act = action.charAt(0).toUpperCase() + action.slice(1);
  return `${res} — ${act}`;
}

const SCOPE_DESCRIPTIONS: Record<string, string> = {
  "cases:read":       "Query case records, status, history",
  "cases:create":     "Submit new cases into the platform",
  "cases:update":     "Execute workflow transitions on cases",
  "referrals:read":   "Query cross-agency referral records",
  "referrals:create": "Dispatch new inter-agency referrals",
  "workflows:read":   "Query workflow definitions and steps",
  "workflows:update": "Execute workflow state transitions",
  "assignments:read": "Query officer assignment records",
  "auditLogs:read":   "Query immutable audit trail entries",
  "departments:read": "Query department / desk records",
  "metrics:read":     "Query SLA and performance metrics",
  "*":                "Unrestricted access to all partner API operations",
};

/**
 * Return the description for a scope, falling back to a generic string
 * for any scope added after this client was last updated.
 */
export function getScopeDescription(scope: ApiKeyScope): string {
  return SCOPE_DESCRIPTIONS[scope] ?? `Access to ${scope} operations`;
}

// ── API Functions ─────────────────────────────────────────────────────────────

/**
 * Fetch the list of all assignable scopes from the backend.
 * This is the canonical source — never hardcode scopes in UI components.
 */
export async function fetchAvailableScopes(): Promise<ScopeMeta[]> {
  const data = (await apiGet("/api/v1/api-keys/scopes")) as { scopes: ApiKeyScope[] };
  return (data.scopes ?? [])
    .filter((s) => s !== "*") // show '*' separately if needed
    .map((s) => ({
      value: s,
      label: getScopeLabel(s),
      description: getScopeDescription(s),
    }));
}

/**
 * List all API keys for the caller's tenant.
 * Raw keys are never returned by this endpoint.
 */
export async function listApiKeys(): Promise<ApiKeyRecord[]> {
  const data = (await apiGet("/api/v1/api-keys")) as { apiKeys: ApiKeyRecord[] };
  return data.apiKeys ?? [];
}

/**
 * Create a new API key.
 * The `rawKey` in the response is shown **only once** — store it securely.
 */
export async function createApiKey(payload: CreateApiKeyPayload): Promise<CreateApiKeyResult> {
  return (await apiPost("/api/v1/api-keys", payload)) as CreateApiKeyResult;
}

/**
 * Permanently revoke an API key.
 */
export async function revokeApiKey(id: string): Promise<void> {
  await apiDelete(`/api/v1/api-keys/${id}`);
}

/**
 * Rotate a key: revokes the old one and issues a new key with the same name/scopes.
 * The new `rawKey` is shown only once.
 */
export async function rotateApiKey(id: string): Promise<RotateApiKeyResult> {
  return (await apiPost(`/api/v1/api-keys/${id}/rotate`, {})) as RotateApiKeyResult;
}
