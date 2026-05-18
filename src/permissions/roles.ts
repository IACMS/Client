/**
 * Backend-aligned permission strings for IACMS.
 *
 * Source of truth: `IACMS/prisma/seed.js` (the `permissions` array) and
 * `IACMS/services/api-gateway/src/middleware/rbac.middleware.js` which maps
 * routes to the same keys. The frontend NEVER infers permissions from a role
 * name; it consumes the `permissions` array on `/api/v1/session/status`.
 */

export type Permission =
  // Cases
  | "cases:create"
  | "cases:read"
  | "cases:update"
  | "cases:delete"
  | "cases:assign"
  | "cases:close"
  // Users
  | "users:create"
  | "users:read"
  | "users:update"
  | "users:delete"
  // Roles
  | "roles:create"
  | "roles:read"
  | "roles:update"
  | "roles:delete"
  | "roles:assign"
  // Workflows
  | "workflows:create"
  | "workflows:read"
  | "workflows:update"
  | "workflows:delete"
  // Audit
  | "audit:read"
  // Tenants
  | "tenants:read"
  | "tenants:update"
  // Platform (system admin only)
  | "platform:manage_tenants"
  // Referrals
  | "referrals:read"
  | "referrals:create"
  | "referrals:update";

/** Backend wildcard tokens accepted by `hasPermission` in the gateway. */
export type PermissionWildcard = "*" | "admin:*" | `${string}:*`;

/**
 * Mirror of the gateway's `hasPermission()` so the frontend yields the same
 * boolean the backend would for any given check (including `*` and resource
 * wildcards like `cases:*`).
 */
export function permissionAllowed(
  granted: ReadonlyArray<string>,
  required: Permission,
): boolean {
  if (granted.includes("*") || granted.includes("admin:*")) return true;
  if (granted.includes(required)) return true;
  const [resource] = required.split(":");
  if (granted.includes(`${resource}:*`)) return true;
  return false;
}
