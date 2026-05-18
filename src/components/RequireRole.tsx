import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import { usePermissions } from "@/permissions/usePermissions";
import type { Permission } from "@/permissions/roles";

type Props = {
  /** Single permission required to render the wrapped routes. */
  permission?: Permission;
  /** OR semantics — render when the user has any of these permissions. */
  anyOf?: Permission[];
  /** Where to send unauthorized users (defaults to /dashboard). */
  redirectTo?: string;
};

/**
 * Generalized role guard. Wraps a route subtree and redirects:
 *  - to `/login` when no session,
 *  - to `redirectTo` (default `/dashboard`) when the user lacks the permission.
 *
 * Backend still enforces the rule; this just keeps non-privileged users from
 * seeing admin pages by URL.
 */
export default function RequireRole({ permission, anyOf, redirectTo = "/dashboard" }: Props) {
  const { user, status } = useSession();
  const { can, anyOf: anyOfFn } = usePermissions();
  const location = useLocation();

  if (status === "loading") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50 text-slate-600">
        <span
          className="material-symbols-outlined text-4xl text-primary animate-pulse"
          aria-hidden
        >
          progress_activity
        </span>
        <p className="font-body-sm">Checking permissions…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  let ok = true;
  if (permission) ok = can(permission);
  else if (anyOf && anyOf.length) ok = anyOfFn(...anyOf);

  if (!ok) return <Navigate to={redirectTo} replace />;

  return <Outlet />;
}
