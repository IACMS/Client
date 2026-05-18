import { useMemo } from "react";
import { useSession } from "@/context/SessionContext";
import { permissionAllowed, type Permission } from "./roles";

export type PermissionsResult = {
  /** Raw permission strings returned by the RBAC service. */
  permissions: ReadonlyArray<string>;
  isAdmin: boolean;
  isSystemAdmin: boolean;
  isTenantAdmin: boolean;
  /** True if the current user holds the given permission (or a matching wildcard). */
  can: (permission: Permission) => boolean;
  /** True if the user holds ANY of the listed permissions. */
  anyOf: (...permissions: Permission[]) => boolean;
  /** True if the user holds ALL of the listed permissions. */
  allOf: (...permissions: Permission[]) => boolean;
};

/**
 * Reads `user.permissions` (populated from `/api/v1/session/status`) and
 * exposes the same `can` semantics as the gateway. No role-name guessing —
 * the backend's RBAC service is the source of truth.
 */
export function usePermissions(): PermissionsResult {
  const { user } = useSession();
  return useMemo<PermissionsResult>(() => {
    const permissions: ReadonlyArray<string> = user?.permissions ?? [];
    const can = (p: Permission) => permissionAllowed(permissions, p);
    // Derive admin flags from the permission set itself so they stay in sync
    // with what the backend actually granted to this session.
    const isSystemAdmin = can("platform:manage_tenants");
    const isTenantAdmin = can("users:create");
    return {
      permissions,
      isAdmin: isSystemAdmin || isTenantAdmin,
      isSystemAdmin,
      isTenantAdmin,
      can,
      anyOf: (...ps: Permission[]) => ps.some(can),
      allOf: (...ps: Permission[]) => ps.every(can),
    };
  }, [user]);
}
