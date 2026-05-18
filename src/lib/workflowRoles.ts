import { apiGet } from "@/lib/api";

export type RbacRoleRow = {
  id: string;
  name: string;
  description?: string | null;
  tenantId?: string | null;
  isSystemRole?: boolean;
};

/** Platform operator — not used in operational case workflows / step permissions. */
const EXCLUDED_FROM_WORKFLOW_CASE_ROLES = new Set(["system_admin", "intake_specialist"]);

/** Human-readable label for workflow pickers and case UI. */
export function humanizeRoleName(name: string): string {
  const s = String(name || "").trim();
  if (!s) return "";
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export async function fetchRbacRoles(options?: { tenantId?: string }): Promise<RbacRoleRow[]> {
  try {
    const qs =
      options?.tenantId &&
      typeof options.tenantId === "string" &&
      options.tenantId.length > 0
        ? `?tenantId=${encodeURIComponent(options.tenantId)}`
        : "";
    const raw = (await apiGet(`/api/v1/rbac/roles${qs}`)) as { roles?: Record<string, unknown>[] };
    const arr = Array.isArray(raw.roles) ? raw.roles : [];
    return arr
      .map((row): RbacRoleRow | null => {
        const id = row.id != null ? String(row.id) : "";
        const name = row.name != null ? String(row.name) : "";
        if (!id || !name) return null;
        const tenantRaw = row.tenantId ?? row.tenant_id;
        return {
          id,
          name,
          description:
            typeof row.description === "string"
              ? row.description
              : row.description === null || row.description === undefined
                ? null
                : undefined,
          tenantId: tenantRaw !== null && tenantRaw !== undefined ? String(tenantRaw) : null,
          isSystemRole: Boolean(row.isSystemRole ?? row.is_system_role),
        };
      })
      .filter((r): r is RbacRoleRow => r !== null);
  } catch {
    return [];
  }
}

/**
 * Roles usable when configuring workflow steps/transitions:
 * hides platform operators and deprecated per-tenant intake roles (use canonical `case_manager`).
 * Dedupes identical role names when multiple IDs exist — prefers global (`tenantId` null).
 */
export function prepareRolesForWorkflowPickers(roles: RbacRoleRow[]): RbacRoleRow[] {
  const usable = roles.filter((r) => r.name && !EXCLUDED_FROM_WORKFLOW_CASE_ROLES.has(r.name));

  const seen = new Map<string, RbacRoleRow>();
  for (const r of usable) {
    const prev = seen.get(r.name);
    if (!prev) {
      seen.set(r.name, r);
      continue;
    }
    const pick =
      prev.tenantId == null && r.tenantId != null
        ? prev
        : r.tenantId == null && prev.tenantId != null
          ? r
          : prev;
    seen.set(r.name, pick);
  }

  return [...seen.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function roleNamesForIds(roles: RbacRoleRow[], ids: string[] | undefined | null): string[] {
  if (!ids?.length) return [];
  const map = new Map(roles.map((r) => [r.id, r.name]));
  return ids.map((id) => {
    const name = map.get(id);
    return name ? humanizeRoleName(name) : `${id.slice(0, 8)}…`;
  });
}
