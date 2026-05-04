import { apiGet } from "@/lib/api";

export type RbacRoleRow = { id: string; name: string; description?: string | null };

export async function fetchRbacRoles(): Promise<RbacRoleRow[]> {
  try {
    const raw = (await apiGet("/api/v1/rbac/roles")) as { roles?: RbacRoleRow[] };
    return Array.isArray(raw.roles) ? raw.roles : [];
  } catch {
    return [];
  }
}

export function roleNamesForIds(roles: RbacRoleRow[], ids: string[] | undefined | null): string[] {
  if (!ids?.length) return [];
  const map = new Map(roles.map((r) => [r.id, r.name]));
  return ids.map((id) => map.get(id) ?? id.slice(0, 8) + "…");
}
