import { Routes, Route } from "react-router-dom";
import RequireAuth from "./components/RequireAuth";
import CasesLayout from "./layouts/CasesLayout";
import DashboardLayout from "./layouts/DashboardLayout";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
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

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify-email" element={<VerifyEmailPage />} />

      <Route element={<RequireAuth />}>
        <Route element={<DashboardLayout />}>
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/settings/api-check" element={<ApiDiagnosticsPage />} />
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
