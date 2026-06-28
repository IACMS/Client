import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { StubNavItem } from "@/components/StubNavItem";
import { ApiError, apiPost } from "@/lib/api";

const SIDE_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCzsDG2bn1Yds1Y1weX61V7TClBwcJTIvgYHqF1c3fbeGHZSJcHCrZXyDhFFrmxXdBPmUKc9Rj_CDwOdqfQNMN10WW6PxS7lEiG-H7Qblv1apOZvz2La8B5lebDC6f-4t0m15GOFOfUvv06xEC3WfVZzRYODV5NKQDSLji0wup4Ni4Mokv0ssbD4oPPVbWv6c0tTUX9ZaubIRFYdwookBR9lbB26B2sN_f83ZbiciNj-DCuWcjwqC4cEJCMPgut5cWZpGm5id9Htt9g";

export default function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [tenant, setTenant] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function sendReset(e: FormEvent) {
    e.preventDefault();
    const em = email.trim().toLowerCase();
    const tc = tenant.trim();
    if (!em) {
      setErrorMessage(t("auth.forgotPassword.emailRequired"));
      return;
    }
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await apiPost("/api/v1/auth/forgot-password", {
        email: em,
        ...(tc ? { tenantCode: tc.toUpperCase() } : {}),
      });
      setDone(true);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : t("auth.forgotPassword.submitFailed");
      setErrorMessage(
        msg.includes("fetch") || msg === "Failed to fetch"
          ? t("auth.apiUnreachableShort")
          : msg,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-background font-body-md text-on-surface min-h-screen flex flex-col">
      <div className="flex-grow flex items-center justify-center p-gutter">
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 bg-surface-container-lowest rounded-xl overflow-hidden border border-outline-variant shadow-sm min-h-[640px]">
          <div className="hidden md:block relative overflow-hidden bg-primary">
            <img
              alt=""
              className="absolute inset-0 w-full h-full object-cover mix-blend-overlay opacity-60"
              src={SIDE_IMG}
            />
            <div className="relative z-10 p-2xl flex flex-col h-full justify-between min-h-[640px]">
              <div>
                <div className="flex items-center gap-md mb-lg">
                  <div className="w-12 h-12 bg-on-primary-container rounded flex items-center justify-center">
                    <span className="material-symbols-outlined text-primary text-3xl">account_balance</span>
                  </div>
                  <span className="font-h2 text-white tracking-tight">IACMS</span>
                </div>
                <h1 className="font-h1 text-white mb-md">{t("auth.forgotPassword.heroTitle")}</h1>
                <p className="font-body-lg text-on-primary-container opacity-90 max-w-sm">
                  {t("auth.forgotPassword.heroBody")}
                </p>
              </div>
              <div className="space-y-md">
                <div className="flex items-center gap-md text-white/80">
                  <span className="material-symbols-outlined text-sm">verified_user</span>
                  <span className="font-label-caps uppercase">{t("auth.forgotPassword.emailReset")}</span>
                </div>
                <div className="h-px bg-white/20 w-full" />
                <p className="font-body-sm text-white/60 italic">{t("auth.forgotPassword.linkHint")}</p>
              </div>
            </div>
          </div>
          <div className="p-xl flex flex-col justify-center">
            {done ? (
              <div>
                <h2 className="font-h2 text-primary mb-xs">{t("auth.forgotPassword.checkEmailTitle")}</h2>
                <p className="font-body-md text-on-surface-variant mb-lg">
                  {t("auth.forgotPassword.checkEmailBody")}
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  {t("auth.forgotPassword.returnToLogin")}
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-xl">
                  <h2 className="font-h2 text-primary mb-xs">{t("auth.forgotPassword.title")}</h2>
                  <p className="font-body-md text-on-surface-variant">{t("auth.forgotPassword.subtitle")}</p>
                </div>
                <form className="space-y-lg" onSubmit={sendReset}>
                  {errorMessage && (
                    <div className="p-md rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{errorMessage}</div>
                  )}
                  <div className="space-y-xs">
                    <label className="font-label-caps text-on-surface-variant uppercase" htmlFor="email">
                      {t("auth.forgotPassword.email")}
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                        mail
                      </span>
                      <input
                        className="w-full pl-11 pr-md py-md bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container focus:border-primary-container outline-none transition-all font-body-md"
                        id="email"
                        placeholder={t("auth.forgotPassword.emailPlaceholder")}
                        type="email"
                        value={email}
                        onChange={(ev) => setEmail(ev.target.value)}
                        required
                        autoComplete="email"
                      />
                    </div>
                  </div>
                  <div className="space-y-xs">
                    <label className="font-label-caps text-on-surface-variant uppercase" htmlFor="tenant">
                      {t("auth.forgotPassword.tenantOptional")}
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                        corporate_fare
                      </span>
                      <input
                        className="w-full pl-11 pr-md py-md bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container focus:border-primary-container outline-none transition-all font-body-md"
                        id="tenant"
                        placeholder={t("auth.forgotPassword.tenantPlaceholder")}
                        type="text"
                        value={tenant}
                        onChange={(ev) => setTenant(ev.target.value)}
                        autoComplete="organization"
                      />
                    </div>
                  </div>
                  <div className="pt-md">
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full bg-primary-container text-white font-semibold py-md rounded-lg hover:bg-primary transition-all flex items-center justify-center gap-md shadow-sm disabled:opacity-60"
                    >
                      {submitting ? t("auth.forgotPassword.sending") : t("auth.forgotPassword.sendLink")}
                      <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </button>
                  </div>
                  <div className="flex justify-center pt-md">
                    <Link className="font-body-sm text-primary hover:underline flex items-center gap-xs" to="/login">
                      <span className="material-symbols-outlined text-sm">arrow_back</span>
                      {t("auth.forgotPassword.returnToLogin")}
                    </Link>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
      <footer className="flex flex-col md:flex-row justify-between items-center w-full py-8 px-6 mt-auto border-t border-slate-200 bg-white">
        <div className="flex flex-col md:flex-row items-center gap-gutter">
          <span className="text-teal-900 font-semibold font-body-sm">{t("auth.forgotPassword.footerPortal")}</span>
          <span className="text-xs font-normal text-slate-500">{t("auth.forgotPassword.footerNotice")}</span>
        </div>
        <div className="flex flex-wrap justify-center gap-lg mt-md md:mt-0 items-center">
          <LanguageSwitcher />
          <StubNavItem className="text-xs font-normal text-slate-500">{t("common.privacyPolicy")}</StubNavItem>
          <Link className="text-xs font-normal text-slate-500 hover:text-teal-600 hover:underline" to="/login">
            {t("nav.signIn")}
          </Link>
        </div>
      </footer>
    </div>
  );
}
