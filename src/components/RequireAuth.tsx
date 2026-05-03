import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useSession } from "@/context/SessionContext";

/** Wrap portal routes; redirects to `/login` when there is no session. */
export default function RequireAuth() {
  const { user, status } = useSession();
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
        <p className="font-body-sm">Checking session…</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  return <Outlet />;
}
