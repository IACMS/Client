import { FormEvent, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { StubNavItem } from "@/components/StubNavItem";
import { useSession } from "@/context/SessionContext";
import { ApiError, apiPost } from "@/lib/api";
import { getPasswordHint, isPasswordValid } from "@/lib/passwordRules";

const HERO_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuAc7CUm4yqRRDQPGCDqcj9F-k4mKrmhDt60OlmT3antKoRgKyYfv20a4BjvxkfITydqlHC1Do6K66sm6L4fTiY6tqLWtvNWq05b9eA00ajNWrRPW8QMiddG4DWioBFtp8qk-Rh3TtHYvssGTL2TDxBjG0cpVMRjN18bFPc8PWvyvtD5q2_N0XHsSUgP69bCfI34Im2UxQ7OhlAKMNEyiEvbcyzzBsq9NdmQPYoimSgpoprOztv6XXRZnqVirG1igmgB5P03-0PtN1U";

export default function TenantRegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, status } = useSession();

  const [agreed, setAgreed] = useState(false);
  const [tenantName, setTenantName] = useState("");
  const [tenantCode, setTenantCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (status === "ready" && user) {
      navigate("/dashboard", { replace: true });
    }
  }, [user, status, navigate]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!agreed) {
      setErrorMessage(t("auth.register.agreementRequired") || "You must agree to the data sharing agreement to continue.");
      return;
    }
    const em = email.trim().toLowerCase();
    const tc = tenantCode.trim().toUpperCase();
    const tn = tenantName.trim();
    const fn = firstName.trim();
    const ln = lastName.trim();
    const un = username.trim().toLowerCase();
    if (!tn || !tc || !fn || !ln || !em || !password) {
      setErrorMessage(t("auth.register.requiredFields"));
      return;
    }
    if (!isPasswordValid(password)) {
      setErrorMessage(getPasswordHint());
      return;
    }
    if (password !== confirmPassword) {
      setErrorMessage(t("auth.register.passwordMismatch"));
      return;
    }
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const body: Record<string, string> = {
        tenantName: tn,
        tenantCode: tc,
        firstName: fn,
        lastName: ln,
        email: em,
        password,
      };
      if (un.length >= 3) body.username = un;

      await apiPost("/api/v1/tenants/self-register", body);

      // Registration is put in a pending state and must be approved by Platform Admins.
      // Do not attempt to log in since the user account is inactive.
      
      setDone(true);
      // Removed automatic navigate to /dashboard
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : t("auth.register.failed");
      setErrorMessage(
        message.includes("fetch") || message === "Failed to fetch"
          ? t("auth.apiUnreachableShort")
          : message,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="font-body-md text-on-surface min-h-[100dvh] flex flex-col">
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center w-full px-6 h-16 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link to="/" className="text-xl font-bold tracking-tight text-teal-900 dark:text-teal-50 font-h1">
            IACMS
          </Link>
          <div className="h-6 w-px bg-slate-200 mx-2" />
          <span className="font-label-caps text-on-surface-variant uppercase tracking-widest">
            {t("auth.tenantRegister.header")}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <LanguageSwitcher />
          <Link to="/login" className="font-body-sm text-primary-container font-semibold hover:underline">
            {t("nav.signIn")}
          </Link>
        </div>
      </header>
      <main className="flex-1 min-h-0 overflow-y-auto w-full">
        <div className="min-h-full flex flex-col justify-center items-center px-gutter py-6 sm:py-8">
          <div className="max-w-5xl w-full">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
              <div className="lg:col-span-5 space-y-lg">
                <div className="bg-primary-container p-lg rounded-xl text-on-primary">
                  <h1 className="font-h1 text-h1 mb-md text-white">{t("auth.tenantRegister.heroTitle")}</h1>
                  <p className="font-body-lg text-body-lg text-on-primary-container mb-xl">
                    {t("auth.tenantRegister.heroBody")}
                  </p>
                  <ul className="space-y-md text-on-primary-container font-body-sm list-disc pl-5">
                    <li>{t("auth.tenantRegister.bullet1")}</li>
                    <li>{t("auth.tenantRegister.bullet2")}</li>
                  </ul>
                </div>
                <div className="relative h-64 rounded-xl overflow-hidden shadow-sm border border-slate-200">
                  <img alt="" className="w-full h-full object-cover" src={HERO_IMG} />
                  <div className="absolute inset-0 bg-gradient-to-t from-primary/60 to-transparent" />
                </div>
              </div>
              <div className="lg:col-span-7">
                <div className="bg-white p-lg rounded-xl border border-outline-variant shadow-sm">
                  <div className="mb-lg border-b border-surface-variant pb-md">
                    <h2 className="font-h2 text-h2 text-primary">{t("auth.tenantRegister.formTitle")}</h2>
                    <p className="font-body-sm text-on-surface-variant mt-xs">
                      {t("auth.tenantRegister.formIntro")}{" "}
                      <Link to="/register" className="text-primary font-semibold hover:underline">
                        {t("auth.tenantRegister.joinExisting")}
                      </Link>
                      .
                    </p>
                  </div>
                  <form className="space-y-lg" onSubmit={handleSubmit}>
                    {errorMessage && (
                      <div className="p-md bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{errorMessage}</div>
                    )}
                    {done && (
                      <div className="p-md bg-teal-50 border border-teal-200 rounded-lg text-teal-800 text-sm">
                        {t("auth.tenantRegister.pendingApproval") || "Registration submitted successfully. Your organization is pending review by platform administrators."}
                      </div>
                    )}
                    {!done && (
                      <>
                      <div className="space-y-sm">
                      <label className="font-label-caps text-on-surface-variant block uppercase tracking-wider" htmlFor="org">
                        {t("auth.tenantRegister.orgName")}
                      </label>
                      <input
                        id="org"
                        className="w-full rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 text-body-md py-md px-md"
                        value={tenantName}
                        onChange={(ev) => setTenantName(ev.target.value)}
                        autoComplete="organization"
                        required
                      />
                    </div>
                    <div className="space-y-sm">
                      <label className="font-label-caps text-on-surface-variant block uppercase tracking-wider" htmlFor="tc">
                        {t("auth.tenantRegister.tenantCode")}
                      </label>
                      <input
                        id="tc"
                        className="w-full rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 text-body-md py-md px-md font-mono uppercase"
                        placeholder={t("auth.tenantRegister.tenantCodePlaceholder")}
                        value={tenantCode}
                        onChange={(ev) => setTenantCode(ev.target.value)}
                        required
                      />
                      <p className="font-body-sm text-on-surface-variant">{t("auth.tenantRegister.tenantCodeHint")}</p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                      <div className="space-y-sm">
                        <label className="font-label-caps text-on-surface-variant block uppercase tracking-wider" htmlFor="fn">
                          {t("auth.register.firstName")}
                        </label>
                        <input
                          id="fn"
                          className="w-full rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 text-body-md py-md px-md"
                          value={firstName}
                          onChange={(ev) => setFirstName(ev.target.value)}
                          autoComplete="given-name"
                          required
                        />
                      </div>
                      <div className="space-y-sm">
                        <label className="font-label-caps text-on-surface-variant block uppercase tracking-wider" htmlFor="ln">
                          {t("auth.register.lastName")}
                        </label>
                        <input
                          id="ln"
                          className="w-full rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 text-body-md py-md px-md"
                          value={lastName}
                          onChange={(ev) => setLastName(ev.target.value)}
                          autoComplete="family-name"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-sm">
                      <label className="font-label-caps text-on-surface-variant block uppercase tracking-wider" htmlFor="un">
                        {t("auth.tenantRegister.usernameOptional")}
                      </label>
                      <input
                        id="un"
                        className="w-full rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 text-body-md py-md px-md font-mono"
                        placeholder={t("auth.tenantRegister.usernamePlaceholder")}
                        value={username}
                        onChange={(ev) => setUsername(ev.target.value)}
                        autoComplete="username"
                      />
                    </div>
                    <div className="space-y-sm">
                      <label className="font-label-caps text-on-surface-variant block uppercase tracking-wider" htmlFor="em">
                        {t("auth.tenantRegister.adminEmail")}
                      </label>
                      <input
                        id="em"
                        type="email"
                        className="w-full rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 text-body-md py-md px-md"
                        value={email}
                        onChange={(ev) => setEmail(ev.target.value)}
                        autoComplete="email"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-lg">
                      <div className="space-y-sm">
                        <label className="font-label-caps text-on-surface-variant block uppercase tracking-wider" htmlFor="pw">
                          {t("auth.register.password")}
                        </label>
                        <input
                          id="pw"
                          type="password"
                          className="w-full rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 text-body-md py-md px-md"
                          value={password}
                          onChange={(ev) => setPassword(ev.target.value)}
                          autoComplete="new-password"
                          required
                        />
                        <p className="font-body-sm text-on-surface-variant">{getPasswordHint()}</p>
                      </div>
                      <div className="space-y-sm">
                        <label className="font-label-caps text-on-surface-variant block uppercase tracking-wider" htmlFor="pwc">
                          {t("auth.register.confirmPassword")}
                        </label>
                        <input
                          id="pwc"
                          type="password"
                          className="w-full rounded-lg border border-outline-variant focus:border-primary focus:ring-2 focus:ring-primary/20 text-body-md py-md px-md"
                          value={confirmPassword}
                          onChange={(ev) => setConfirmPassword(ev.target.value)}
                          autoComplete="new-password"
                          required
                        />
                      </div>
                    </div>
                    <label className="flex items-start gap-md bg-surface-container-low p-md rounded-lg border border-outline-variant cursor-pointer">
                      <div className="flex items-center h-5 shrink-0">
                        <input
                          className="h-4 w-4 rounded text-primary focus:ring-primary border-outline-variant"
                          type="checkbox"
                          checked={agreed}
                          onChange={(ev) => setAgreed(ev.target.checked)}
                        />
                      </div>
                      <span className="font-body-sm text-on-surface-variant leading-tight">
                        {t("auth.register.agreement")}{" "}
                        <StubNavItem className="inline text-primary font-bold underline underline-offset-2 align-baseline leading-tight">
                          {t("auth.register.dataSharingAgreement")}
                        </StubNavItem>
                        .
                      </span>
                    </label>
                    </>
                    )}
                    <div className="pt-md border-t border-surface-variant">
                      <button
                        disabled={done || submitting}
                        className="w-full bg-primary-container text-white py-lg rounded-lg font-h3 hover:opacity-90 transition-all flex items-center justify-center gap-md disabled:opacity-50 disabled:pointer-events-none"
                        type="submit"
                      >
                        {submitting ? t("auth.tenantRegister.creating") : (done ? "Submitted" : t("auth.tenantRegister.create"))}
                        <span className="material-symbols-outlined">domain_add</span>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-4 px-gutter text-center text-xs text-slate-500">
        <Link className="hover:text-teal-600 hover:underline" to="/login">
          {t("nav.signIn")}
        </Link>
        {" · "}
        <Link className="hover:text-teal-600 hover:underline" to="/register">
          {t("auth.tenantRegister.footerJoinExisting")}
        </Link>
      </footer>
    </div>
  );
}
