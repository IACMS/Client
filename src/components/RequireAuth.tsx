import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";

/** Wrap portal routes; redirects to `/login` when there is no session. */
export default function RequireAuth() {
  const { t } = useTranslation();
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
        <p className="font-body-sm">{t("auth.checkingSession")}</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  }

  /** Block app routes until first password change (admin-created / invited users). Allowed: `/settings` only. */
  if (user.mustChangePassword === true) {
    const path = location.pathname;
    const onPasswordPage = path === "/settings" || path === "/settings/";
    if (!onPasswordPage) {
      return <Navigate to="/settings" replace state={{ from: path + location.search }} />;
    }
  }

  return <Outlet />;
}
