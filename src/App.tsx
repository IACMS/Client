import { Routes, Route, Navigate } from "react-router-dom";
import RequireAuth from "./components/RequireAuth";
import RequireAdmin from "./components/RequireAdmin";
import RequireRole from "./components/RequireRole";
import ForbiddenBanner from "./components/ForbiddenBanner";
import AnnouncementBanner from "./components/portal/AnnouncementBanner";
import CasesLayout from "./layouts/CasesLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import TenantRegisterPage from "./pages/TenantRegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import VerifyEmailPage from "./pages/VerifyEmailPage";
import SettingsPage from "./pages/SettingsPage";
import ApiDiagnosticsPage from "./pages/ApiDiagnosticsPage";
import DashboardPage from "./pages/DashboardPage";
import CasesPage from "./pages/CasesPage";
import CaseDetailPage from "./pages/CaseDetailPage";
import AgenciesLayout from "./layouts/AgenciesLayout";
import AgenciesPage from "./pages/AgenciesPage";
import AgencyDetailPage from "./pages/AgencyDetailPage";
import NotFoundPage from "./pages/NotFoundPage";
import WorkflowsPage from "./pages/WorkflowsPage";
import WorkflowDesignerPage from "./pages/WorkflowDesignerPage";
import UsersPage from "./pages/UsersPage";
import ReferralsPage from "./pages/ReferralsPage";
import AuditPage from "./pages/AuditPage";
import TasksPage from "./pages/TasksPage";
import ReportsPage from "./pages/ReportsPage";
import ChatPage from "./pages/ChatPage";
import TenantSettingsPage from "./pages/TenantSettingsPage";
import DepartmentsPage from "./pages/DepartmentsPage";
import PlatformUsersPage from "./pages/PlatformUsersPage";
import PlatformRolesPage from "./pages/PlatformRolesPage";
import PlatformSettingsPage from "./pages/PlatformSettingsPage";
import PlatformAnnouncementsPage from "./pages/PlatformAnnouncementsPage";
import PlatformSupportPage from "./pages/PlatformSupportPage";
import PlatformResourcesPage from "./pages/PlatformResourcesPage";
import { useSession } from "./context/SessionContext";
import { useEffect } from "react";

export default function App() {
  const { user } = useSession();

  useEffect(() => {
    // Dynamic tenant branding injection
    const config = user?.tenant?.config;
    if (config?.primaryColor) {
      document.documentElement.style.setProperty(
        "--iacms-primary",
        config.primaryColor,
      );
    }
    if (config?.secondaryColor) {
      document.documentElement.style.setProperty(
        "--iacms-secondary",
        config.secondaryColor,
      );
    }
    if (config?.fontPreference) {
      document.documentElement.style.setProperty(
        "--font-family-body",
        config.fontPreference,
      );
    }
  }, [user?.tenant]);

  return (
    <>
      <ForbiddenBanner />
      <AnnouncementBanner />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/register-organization" element={<TenantRegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/verify-email" element={<VerifyEmailPage />} />

        <Route element={<RequireAuth />}>
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route element={<RequireRole permission="cases:read" />}>
              <Route path="/tasks" element={<TasksPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/chat" element={<ChatPage />} />
            </Route>
            <Route path="/settings" element={<SettingsPage />} />
            <Route element={<RequireRole permission="referrals:read" />}>
              <Route path="/referrals" element={<ReferralsPage />} />
            </Route>
            <Route element={<RequireRole permission="audit:read" />}>
              <Route path="/audit" element={<AuditPage />} />
            </Route>
            <Route
              element={<RequireRole permission="platform:manage_tenants" />}
            >
              <Route path="/api-health" element={<ApiDiagnosticsPage />} />
              <Route path="/platform/users" element={<PlatformUsersPage />} />
              <Route path="/platform/roles" element={<PlatformRolesPage />} />
              <Route path="/platform/settings" element={<PlatformSettingsPage />} />
              <Route path="/platform/announcements" element={<PlatformAnnouncementsPage />} />
              <Route path="/platform/support" element={<PlatformSupportPage />} />
              <Route path="/platform/resources" element={<PlatformResourcesPage />} />
            </Route>

            {/* Workflow list + graph: read shows the designer as view-only; mutations stay workflows:update. */}
            <Route path="/workflows" element={<WorkflowsPage />} />
            <Route
              element={
                <RequireRole anyOf={["workflows:read", "workflows:update"]} />
              }
            >
              <Route
                path="/workflows/:id/designer"
                element={<WorkflowDesignerPage />}
              />
            </Route>

            {/* Admin-only routes: hidden from non-admins in the UI and blocked here. */}
            <Route element={<RequireAdmin />}>
              <Route path="/settings/tenant" element={<TenantSettingsPage />} />
              <Route
                path="/settings/departments"
                element={<DepartmentsPage />}
              />
              <Route path="/users" element={<UsersPage />} />
            </Route>
          </Route>

          <Route element={<CasesLayout />}>
            <Route path="/cases" element={<CasesPage />} />
            <Route path="/cases/:caseId" element={<CaseDetailPage />} />
          </Route>

          <Route element={<AgenciesLayout />}>
            <Route path="/agencies" element={<AgenciesPage />} />
            <Route
              path="/agencies/:agencySlug"
              element={<AgencyDetailPage />}
            />
          </Route>

          <Route
            path="/settings/api-check"
            element={<Navigate to="/api-health" replace />}
          />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </>
  );
}
