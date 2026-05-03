import { Routes, Route } from "react-router-dom";
import RequireAuth from "./components/RequireAuth";
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
import TenantSettingsPage from "./pages/TenantSettingsPage";
import { useSession } from "./context/SessionContext";
import { useEffect } from "react";

export default function App() {
  const { user } = useSession();

  useEffect(() => {
    // Dynamic tenant branding injection
    const config = (user?.tenant as any)?.config;
    if (config?.primaryColor) {
      document.documentElement.style.setProperty('--color-primary', config.primaryColor);
      // Fallback/override for our Tailwind primary hex
      document.documentElement.style.setProperty('--color-primary-hex', config.primaryColor);
    }
    if (config?.secondaryColor) {
      document.documentElement.style.setProperty('--color-secondary', config.secondaryColor);
    }
    if (config?.fontPreference) {
      document.documentElement.style.setProperty('--font-family-body', config.fontPreference);
    }
  }, [user?.tenant]);

  return (
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
          <Route path="/workflows" element={<WorkflowsPage />} />
          <Route path="/workflows/:id/designer" element={<WorkflowDesignerPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/api-check" element={<ApiDiagnosticsPage />} />
          <Route path="/settings/tenant" element={<TenantSettingsPage />} />
          <Route path="/users" element={<UsersPage />} />
        </Route>

        <Route element={<CasesLayout />}>
          <Route path="/cases" element={<CasesPage />} />
          <Route path="/cases/:caseId" element={<CaseDetailPage />} />
        </Route>

        <Route element={<AgenciesLayout />}>
          <Route path="/agencies" element={<AgenciesPage />} />
          <Route path="/agencies/:agencySlug" element={<AgencyDetailPage />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
