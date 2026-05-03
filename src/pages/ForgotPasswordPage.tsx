import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { StubNavItem } from "@/components/StubNavItem";
import { ApiError, apiPost } from "@/lib/api";

const SIDE_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCzsDG2bn1Yds1Y1weX61V7TClBwcJTIvgYHqF1c3fbeGHZSJcHCrZXyDhFFrmxXdBPmUKc9Rj_CDwOdqfQNMN10WW6PxS7lEiG-H7Qblv1apOZvz2La8B5lebDC6f-4t0m15GOFOfUvv06xEC3WfVZzRYODV5NKQDSLji0wup4Ni4Mokv0ssbD4oPPVbWv6c0tTUX9ZaubIRFYdwookBR9lbB26B2sN_f83ZbiciNj-DCuWcjwqC4cEJCMPgut5cWZpGm5id9Htt9g";

export default function ForgotPasswordPage() {
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
      setErrorMessage("Email is required.");
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
            : "Could not submit reset request.";
      setErrorMessage(
        msg.includes("fetch") || msg === "Failed to fetch"
          ? "Cannot reach the API gateway. Check VITE_API_URL and that the backend is running."
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
                <h1 className="font-h1 text-white mb-md">Secure Credential Recovery</h1>
                <p className="font-body-lg text-on-primary-container opacity-90 max-w-sm">
                  If your account exists, you will receive an email with a link to reset your password (when the
                  notification service and SMTP are configured).
                </p>
              </div>
              <div className="space-y-md">
                <div className="flex items-center gap-md text-white/80">
                  <span className="material-symbols-outlined text-sm">verified_user</span>
                  <span className="font-label-caps uppercase">Email-based reset</span>
                </div>
                <div className="h-px bg-white/20 w-full" />
                <p className="font-body-sm text-white/60 italic">
                  The reset link points to <span className="font-mono text-xs">/reset-password?token=…</span> on this app.
                </p>
              </div>
            </div>
          </div>
          <div className="p-xl flex flex-col justify-center">
            {done ? (
              <div>
                <h2 className="font-h2 text-primary mb-xs">Check your email</h2>
                <p className="font-body-md text-on-surface-variant mb-lg">
                  If an account with that email exists, a password reset link has been sent. Follow the link to choose a
                  new password.
                </p>
                <Link
                  to="/login"
                  className="inline-flex items-center gap-2 text-primary font-semibold hover:underline"
                >
                  <span className="material-symbols-outlined text-sm">arrow_back</span>
                  Return to login
                </Link>
              </div>
            ) : (
              <>
                <div className="mb-xl">
                  <h2 className="font-h2 text-primary mb-xs">Forgot password</h2>
                  <p className="font-body-md text-on-surface-variant">We&apos;ll email a reset link if the account exists.</p>
                </div>
                <form className="space-y-lg" onSubmit={sendReset}>
                  {errorMessage && (
                    <div className="p-md rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm">{errorMessage}</div>
                  )}
                  <div className="space-y-xs">
                    <label className="font-label-caps text-on-surface-variant uppercase" htmlFor="email">
                      Email
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                        mail
                      </span>
                      <input
                        className="w-full pl-11 pr-md py-md bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container focus:border-primary-container outline-none transition-all font-body-md"
                        id="email"
                        placeholder="name@agency.gov"
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
                      Tenant code (optional)
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                        corporate_fare
                      </span>
                      <input
                        className="w-full pl-11 pr-md py-md bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container focus:border-primary-container outline-none transition-all font-body-md"
                        id="tenant"
                        placeholder="e.g. TEST-ORG"
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
                      {submitting ? "Sending…" : "Send reset link"}
                      <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </button>
                  </div>
                  <div className="flex justify-center pt-md">
                    <Link className="font-body-sm text-primary hover:underline flex items-center gap-xs" to="/login">
                      <span className="material-symbols-outlined text-sm">arrow_back</span>
                      Return to login
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
          <span className="text-teal-900 font-semibold font-body-sm">IACMS Portal</span>
          <span className="text-xs font-normal text-slate-500">© 2024 Government Case Management System.</span>
        </div>
        <div className="flex flex-wrap justify-center gap-lg mt-md md:mt-0 items-center">
          <StubNavItem className="text-xs font-normal text-slate-500">Privacy Policy</StubNavItem>
          <Link className="text-xs font-normal text-slate-500 hover:text-teal-600 hover:underline" to="/login">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
