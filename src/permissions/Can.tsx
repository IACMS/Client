import type { ReactNode } from "react";
import { usePermissions } from "./usePermissions";
import type { Permission } from "./roles";

type CanProps = {
  /** Single permission required. Use exactly one of `permission` or `anyOf`/`allOf`. */
  permission?: Permission;
  /** Render when the user has any of these permissions. */
  anyOf?: Permission[];
  /** Render when the user has all of these permissions. */
  allOf?: Permission[];
  /** Optional fallback to render when the user does not have permission. */
  fallback?: ReactNode;
  children: ReactNode;
};

/**
 * Conditionally renders `children` when the current user holds the required
 * permission(s). Keeps action-level UI gating in one place so backend RBAC
 * stays the source of truth and the frontend can't accidentally show buttons
 * that the user could not invoke.
 */
export default function Can({
  permission,
  anyOf,
  allOf,
  fallback = null,
  children,
}: CanProps) {
  const { can, anyOf: anyOfFn, allOf: allOfFn } = usePermissions();
  let ok = true;
  if (permission) ok = can(permission);
  else if (anyOf && anyOf.length) ok = anyOfFn(...anyOf);
  else if (allOf && allOf.length) ok = allOfFn(...allOf);
  return <>{ok ? children : fallback}</>;
}
