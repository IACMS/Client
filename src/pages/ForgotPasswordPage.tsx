import { FormEvent, useState } from "react";
import { Link } from "react-router-dom";
import { StubNavItem } from "@/components/StubNavItem";

const SIDE_IMG =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuCzsDG2bn1Yds1Y1weX61V7TClBwcJTIvgYHqF1c3fbeGHZSJcHCrZXyDhFFrmxXdBPmUKc9Rj_CDwOdqfQNMN10WW6PxS7lEiG-H7Qblv1apOZz2La8B5lebDC6f-4t0m15GOFOfUvv06xEC3WfVZzRYODV5NKQDSLji0wup4Ni4Mokv0ssbD4oPPVbWv6c0tTUX9ZaubIRFYdwookBR9lbB26B2sN_f83ZbiciNj-DCuWcjwqC4cEJCMPgut5cWZpGm5id9Htt9g";

type Step = "forgot" | "reset" | "success";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("forgot");
  const [email, setEmail] = useState("");
  const [tenant, setTenant] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function sendReset(e: FormEvent) {
    e.preventDefault();
    setStep("reset");
  }

  function updatePassword(e: FormEvent) {
    e.preventDefault();
    setStep("success");
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
                  Accessing the Inter-Agency Case Management System requires verified authentication. Follow
                  the institutional protocols to restore your account access.
                </p>
              </div>
              <div className="space-y-md">
                <div className="flex items-center gap-md text-white/80">
                  <span className="material-symbols-outlined text-sm">verified_user</span>
                  <span className="font-label-caps uppercase">Standard Protocol v4.2</span>
                </div>
                <div className="h-px bg-white/20 w-full" />
                <p className="font-body-sm text-white/60 italic">
                  Authorized personnel only. All access attempts are logged for audit purposes.
                </p>
              </div>
            </div>
          </div>
          <div className="p-xl flex flex-col justify-center">
            {step === "forgot" && (
              <div id="forgot-step">
                <div className="mb-xl">
                  <h2 className="font-h2 text-primary mb-xs">Forgot Password</h2>
                  <p className="font-body-md text-on-surface-variant">Verify your identity to receive a reset link.</p>
                </div>
                <form className="space-y-lg" onSubmit={sendReset}>
                  <div className="space-y-xs">
                    <label className="font-label-caps text-on-surface-variant uppercase" htmlFor="email">
                      Institutional Email
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
                      />
                    </div>
                  </div>
                  <div className="space-y-xs">
                    <label className="font-label-caps text-on-surface-variant uppercase" htmlFor="tenant">
                      Tenant Code
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                        corporate_fare
                      </span>
                      <input
                        className="w-full pl-11 pr-md py-md bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container focus:border-primary-container outline-none transition-all font-body-md"
                        id="tenant"
                        placeholder="e.g., DIV-204-SEC"
                        type="text"
                        value={tenant}
                        onChange={(ev) => setTenant(ev.target.value)}
                        required
                      />
                    </div>
                  </div>
                  <div className="pt-md">
                    <button
                      type="submit"
                      className="w-full bg-primary-container text-white font-semibold py-md rounded-lg hover:bg-primary transition-all flex items-center justify-center gap-md shadow-sm"
                    >
                      Send Reset Link
                      <span className="material-symbols-outlined text-lg">arrow_forward</span>
                    </button>
                  </div>
                  <div className="flex justify-center pt-md">
                    <Link className="font-body-sm text-primary hover:underline flex items-center gap-xs" to="/login">
                      <span className="material-symbols-outlined text-sm">arrow_back</span>
                      Return to Login
                    </Link>
                  </div>
                </form>
              </div>
            )}
            {step === "reset" && (
              <div id="reset-step">
                <div className="mb-xl">
                  <h2 className="font-h2 text-primary mb-xs">Reset Password</h2>
                  <p className="font-body-md text-on-surface-variant">Create a new secure password for your account.</p>
                </div>
                <form className="space-y-lg" onSubmit={updatePassword}>
                  <div className="space-y-xs">
                    <label className="font-label-caps text-on-surface-variant uppercase" htmlFor="new-password">
                      New Password
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                        lock
                      </span>
                      <input
                        className="w-full pl-11 pr-md py-md bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container focus:border-primary-container outline-none transition-all font-body-md"
                        id="new-password"
                        placeholder="••••••••••••"
                        type="password"
                        value={newPassword}
                        onChange={(ev) => setNewPassword(ev.target.value)}
                        minLength={12}
                        required
                      />
                    </div>
                    <p className="text-[10px] text-on-surface-variant/70 mt-1 uppercase tracking-wider">
                      Must be at least 12 characters with numeric &amp; special values
                    </p>
                  </div>
                  <div className="space-y-xs">
                    <label className="font-label-caps text-on-surface-variant uppercase" htmlFor="confirm-password">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-md top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                        verified
                      </span>
                      <input
                        className="w-full pl-11 pr-md py-md bg-surface-container-low border border-outline-variant rounded-lg focus:ring-2 focus:ring-primary-container focus:border-primary-container outline-none transition-all font-body-md"
                        id="confirm-password"
                        placeholder="••••••••••••"
                        type="password"
                        value={confirmPassword}
                        onChange={(ev) => setConfirmPassword(ev.target.value)}
                        minLength={12}
                        required
                      />
                    </div>
                  </div>
                  <div className="pt-md">
                    <button
                      type="submit"
                      className="w-full bg-primary-container text-white font-semibold py-md rounded-lg hover:bg-primary transition-all flex items-center justify-center gap-md shadow-sm disabled:opacity-40 disabled:pointer-events-none"
                      disabled={newPassword !== confirmPassword || newPassword.length < 12}
                    >
                      Update Password
                      <span className="material-symbols-outlined text-lg">check_circle</span>
                    </button>
                  </div>
                </form>
              </div>
            )}
            {step === "success" && (
              <div className="text-center" id="success-step">
                <div className="mb-xl flex flex-col items-center">
                  <div className="w-20 h-20 bg-primary-fixed rounded-full flex items-center justify-center mb-lg">
                    <span className="material-symbols-outlined text-primary text-5xl" style={{ fontVariationSettings: "'FILL' 1" }}>
                      check_circle
                    </span>
                  </div>
                  <h2 className="font-h2 text-primary mb-xs">Success</h2>
                  <p className="font-body-md text-on-surface-variant max-w-xs mx-auto">
                    Password updated successfully. Return to Login.
                  </p>
                </div>
                <div className="pt-md">
                  <Link
                    className="inline-flex items-center justify-center gap-md w-full bg-primary-container text-white font-semibold py-md rounded-lg hover:bg-primary transition-all shadow-sm"
                    to="/login"
                  >
                    Return to Login
                    <span className="material-symbols-outlined text-lg">login</span>
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <footer className="flex flex-col md:flex-row justify-between items-center w-full py-8 px-6 mt-auto border-t border-slate-200 bg-white">
        <div className="flex flex-col md:flex-row items-center gap-gutter">
          <span className="text-teal-900 font-semibold font-body-sm">IACMS Portal</span>
          <span className="text-xs font-normal text-slate-500">© 2024 Government Case Management System. Official Use Only.</span>
        </div>
        <div className="flex flex-wrap justify-center gap-lg mt-md md:mt-0 items-center">
          <StubNavItem className="text-xs font-normal text-slate-500">Privacy Policy</StubNavItem>
          <StubNavItem className="text-xs font-normal text-slate-500">Terms of Service</StubNavItem>
          <StubNavItem className="text-xs font-normal text-slate-500">Accessibility</StubNavItem>
          <Link className="text-xs font-normal text-slate-500 hover:text-teal-600 hover:underline" to="/login">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}
