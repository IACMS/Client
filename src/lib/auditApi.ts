export type AuditLogRow = {
  id: string;
  action: string;
  entityType?: string | null;
  entityId?: string | null;
  createdAt: string;
  userId?: string | null;
  tenantId?: string | null;
  relatedTenantId?: string | null;
  oldValues?: unknown;
  newValues?: unknown;
  metadata?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  user?: { email?: string; firstName?: string; lastName?: string } | null;
  tenant?: { id?: string; code?: string; name?: string } | null;
  relatedTenant?: { id?: string; code?: string; name?: string } | null;
};

export type AuditFilters = {
  search?: string;
  action?: string;
  entityType?: string;
  entityId?: string;
  userId?: string;
  startDate?: string;
  endDate?: string;
  sortBy?: "createdAt" | "action" | "entityType" | "entityId";
  sortDir?: "asc" | "desc";
  limit?: number;
  offset?: number;
  /** Comma-separated action substrings to exclude from results (e.g. "login,logout,password"). */
  excludeActions?: string;
};

/**
 * Default auth/session action substrings excluded from the audit display.
 * Keeps the audit page focused on case-management operations only.
 */
export const AUTH_EXCLUDED_ACTIONS =
  "login,logout,password,email_verif,token_refresh,register,session,verify_email,forgot_password,reset_password";

export type AuditListResponse = {
  logs?: AuditLogRow[];
  total?: number;
  limit?: number;
  offset?: number;
  sortBy?: string;
  sortDir?: string;
};

export function buildAuditQueryParams(
  filters: AuditFilters,
): Record<string, string> {
  const p: Record<string, string> = {};
  if (filters.search?.trim()) p.search = filters.search.trim();
  if (filters.action?.trim()) p.action = filters.action.trim();
  if (filters.entityType?.trim()) p.entityType = filters.entityType.trim();
  if (filters.entityId?.trim()) p.entityId = filters.entityId.trim();
  if (filters.userId?.trim()) p.userId = filters.userId.trim();
  if (filters.startDate) p.startDate = filters.startDate;
  if (filters.endDate) p.endDate = filters.endDate;
  if (filters.sortBy) p.sortBy = filters.sortBy;
  if (filters.sortDir) p.sortDir = filters.sortDir;
  if (filters.limit != null) p.limit = String(filters.limit);
  if (filters.offset != null) p.offset = String(filters.offset);
  if (filters.excludeActions?.trim())
    p.excludeActions = filters.excludeActions.trim();
  return p;
}

/** ISO date (YYYY-MM-DD) for date inputs. */
export function isoDateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function auditDatePresets(): {
  label: string;
  start: string;
  end: string;
}[] {
  const today = new Date();
  const end = isoDateOnly(today);
  const d7 = new Date(today);
  d7.setDate(d7.getDate() - 7);
  const d30 = new Date(today);
  d30.setDate(d30.getDate() - 30);
  const d90 = new Date(today);
  d90.setDate(d90.getDate() - 90);
  return [
    { label: "Last 7 days", start: isoDateOnly(d7), end },
    { label: "Last 30 days", start: isoDateOnly(d30), end },
    { label: "Last 90 days", start: isoDateOnly(d90), end },
  ];
}

export function formatAuditWhen(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export function formatAuditJson(value: unknown): string {
  if (value == null) return "—";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function auditActorLabel(log: AuditLogRow): string {
  if (log.user?.email) return log.user.email;
  const name = [log.user?.firstName, log.user?.lastName]
    .filter(Boolean)
    .join(" ");
  if (name) return name;
  if (log.userId) return log.userId;
  return "System";
}
