import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useIsAdmin, useSession } from "@/context/SessionContext";

/**
 * Wrap admin-only portal routes. Renders the child route when the current
 * user is a system or tenant admin, otherwise redirects to `/dashboard`
 * (or `/login` if there is no session). The backend remains the source of
 * truth; this guard just prevents non-admin users from reaching admin UI.
 */
export default function RequireAdmin() {
  const { user, status } = useSession();
  const { isAdmin } = useIsAdmin();
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

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}
