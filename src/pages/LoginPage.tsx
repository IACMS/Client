import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { StubNavItem } from "@/components/StubNavItem";
import { useSession } from "@/context/SessionContext";
import { ApiError, apiPost, persistAuthTokensFromResponse } from "@/lib/api";

const BRAND_PATTERN =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAeQWu8uDOUDIBHFNGG48Xom1xvOzeaOko60cXFxqIuh3JS2xFCfWvxOycITRH7rZNYZXQq__PiVZJzmC7x7LwQyGArEA_7lgNdjhuWlTCUnybY4OE1vONGiFUkIql0pZgPjlMUrgIer44X2gJXP2iVVxU-p9tiWWlehWiAiEqbIDEc2b_oL5UJDAlscBl4E1Qstm-IgydRdmZTSPQHTxUy6Nn4KII14nDqsVI5_PcybX2255Is17ZCOAokJneVoYHp8L3KD8k-zFE";

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { refresh, user, status } = useSession();
  const [tenantCode, setTenantCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fromPath =
    (location.state as { from?: string } | null)?.from && typeof (location.state as { from?: string }).from === "string"
      ? (location.state as { from: string }).from
      : "/dashboard";

  useEffect(() => {
    if (status === "ready" && user) {
      navigate(fromPath, { replace: true });
    }
  }, [user, status, fromPath, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = { tenantCode: tenantCode.trim(), email: email.trim(), password };
    if (!trimmed.tenantCode || !trimmed.email || !trimmed.password) {
      setAuthError(true);
      setErrorMessage(null);
      return;
    }
    setAuthError(false);
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const code = trimmed.tenantCode;
      const raw = await apiPost("/api/v1/session/login", {
        email: trimmed.email,
        password: trimmed.password,
        tenantCode: code.length > 0 ? code : undefined,
      });
      persistAuthTokensFromResponse(raw);
      await refresh();
      navigate(fromPath, { replace: true });
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("auth.signInFailed");
      const friendly =
        message.includes("fetch") || message === "Failed to fetch"
          ? t("auth.apiUnreachable")
          : message.includes("POLICY_UNAVAILABLE") || message.includes("Authorization service")
            ? t("auth.rbacUnavailable")
            : message.includes("Authentication service is unavailable") || message.includes("SERVICE_UNAVAILABLE")
              ? t("auth.authUnavailable")
              : message;
      setErrorMessage(friendly);
      setAuthError(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading") {
    return (
      <div className="font-body-md text-on-surface min-h-dvh flex flex-col items-center justify-center">
        <span className="material-symbols-outlined text-4xl text-primary-container animate-pulse" aria-hidden>
          progress_activity
        </span>
        <p className="text-sm text-on-surface-variant mt-4">{t("common.loading")}</p>
      </div>
    );
  }

  return (
    <div className="font-body-md text-on-surface min-h-dvh flex flex-col overflow-x-hidden overflow-y-auto">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>
      <main className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 min-h-0 py-8 sm:py-12 lg:py-16 w-full">
        <div className="w-full max-w-[440px] sm:max-w-[460px] shrink-0 flex flex-col items-center">
          <div className="text-center mb-6 sm:mb-8 w-full">
            <Link to="/" className="inline-block">
              <h1 className="font-h1 text-primary-container tracking-tight text-4xl sm:text-5xl font-black leading-tight">
                IACMS
              </h1>
            </Link>
            <p className="font-body-sm text-body-sm text-secondary mt-2 px-2">
              {t("auth.brandSubtitle")}
            </p>
          </div>
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 sm:p-8 shadow-sm w-full">
            <header className="mb-5 sm:mb-6 border-b border-surface-variant pb-4">
              <h2 className="font-h3 text-xl sm:text-2xl text-on-surface">{t("auth.secureAccessTitle")}</h2>
              <p className="font-body-sm text-sm text-on-surface-variant mt-2 leading-relaxed">
                {t("auth.secureAccessIntro")}
              </p>
            </header>
            <form className="space-y-4 sm:space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase text-xs tracking-wide" htmlFor="tenant_code">
                  {t("auth.tenantCode")}
                </label>
                <div className="relative">
                  <input
                    className="w-full px-3.5 py-3 text-sm bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container transition-all placeholder:text-outline-variant"
                    id="tenant_code"
                    placeholder={t("auth.tenantCodePlaceholder")}
                    type="text"
                    value={tenantCode}
                    onChange={(ev) => {
                      setTenantCode(ev.target.value);
                      setAuthError(false);
                      setErrorMessage(null);
                    }}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-outline-variant text-base">domain</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <label className="font-label-caps text-label-caps text-on-surface-variant uppercase text-xs tracking-wide" htmlFor="email">
                  {t("auth.email")}
                </label>
                <div className="relative">
                  <input
                    className="w-full px-3.5 py-3 text-sm bg-white border border-outline rounded-lg focus:ring-2 focus:ring-primary-container/20 focus:border-primary-container transition-all placeholder:text-outline-variant"
                    id="email"
                    placeholder={t("auth.emailPlaceholder")}
                    type="email"
                    value={email}
                    onChange={(ev) => {
                      setEmail(ev.target.value);
                      setAuthError(false);
                      setErrorMessage(null);
                    }}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                    <span className="material-symbols-outlined text-outline-variant text-base">mail</span>
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center gap-2">
                  <label className="font-label-caps text-label-caps text-on-surface-variant uppercase text-xs tracking-wide" htmlFor="password">
                    {t("auth.password")}
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary-container font-semibold hover:underline shrink-0"
                  >
                    {t("auth.forgotPassword.title")}
                  </Link>
                </div>
                <div className="relative">
                  <input
                    className={`w-full px-3.5 py-3 text-sm bg-white border rounded-lg focus:ring-2 transition-all placeholder:text-outline-variant ${authError
                        ? "border-error focus:ring-error/20 focus:border-error"
                        : "border-outline focus:ring-primary-container/20 focus:border-primary-container"
                      }`}
                    id="password"
                    placeholder="••••••••"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(ev) => {
                      setPassword(ev.target.value);
                      setAuthError(false);
                      setErrorMessage(null);
                    }}
                  />
                  <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <button
                      type="button"
                      className={`material-symbols-outlined text-md cursor-pointer bg-transparent border-0 p-0 ${authError ? "text-error" : "text-outline-variant"
                        }`}
                      aria-label={showPassword ? t("auth.hidePassword") : t("auth.showPassword")}
                      onClick={() => setShowPassword((v) => !v)}
                    >
                      {showPassword ? "visibility" : "visibility_off"}
                    </button>
                  </div>
                </div>
                {authError && (
                  <p className="text-sm text-error flex items-start gap-2 leading-relaxed mt-1">
                    <span className="material-symbols-outlined text-sm shrink-0">error</span>
                    {errorMessage ?? t("auth.credentialsHint")}
                  </p>
                )}
              </div>
              <button
                className="w-full bg-primary-container text-on-primary py-3.5 rounded-lg text-base font-semibold hover:bg-opacity-90 active:scale-[0.98] transition-all flex justify-center items-center gap-2 mt-1 disabled:opacity-60 disabled:pointer-events-none"
                type="submit"
                disabled={submitting}
              >
                {submitting ? t("auth.signingIn") : t("auth.signIn")}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </form>
            <div className="mt-6 sm:mt-7 pt-5 border-t border-surface-variant flex flex-col items-center gap-3 text-center">
              <p className="text-sm text-on-surface-variant">{t("auth.noAccess")}</p>
              <Link
                to="/register"
                className="text-base font-bold text-primary-container border-2 border-primary-container/20 px-8 py-2.5 rounded-full hover:bg-primary-container/5 transition-colors"
              >
                {t("auth.requestAccess")}
              </Link>
              <Link to="/register-organization" className="text-sm font-semibold text-primary hover:underline">
                {t("auth.createOrganization")}
              </Link>
            </div>
          </div>
          <footer className="text-center mt-8 sm:mt-10 w-full max-w-[460px] px-2 pb-4 sm:pb-6">
            <p className="text-xs sm:text-sm text-on-surface-variant leading-relaxed max-w-md mx-auto">
              {t("auth.footerNotice")}
            </p>
            <div className="flex justify-center gap-md mt-4 flex-wrap items-center">
              <StubNavItem className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                {t("common.privacyPolicy")}
              </StubNavItem>
              <span className="text-outline-variant">•</span>
              <StubNavItem className="font-label-caps text-label-caps text-on-surface-variant uppercase">
                {t("common.accessibility")}
              </StubNavItem>
            </div>
          </footer>
        </div>
      </main>
      <div className="fixed bottom-0 right-0 w-64 h-64 opacity-5 pointer-events-none translate-x-1/4 translate-y-1/4">
        <img alt="" className="w-full h-full object-contain" src={BRAND_PATTERN} />
      </div>
    </div>
  );
}
