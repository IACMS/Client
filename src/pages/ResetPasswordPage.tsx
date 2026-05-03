import { FormEvent, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, apiPost } from "@/lib/api";
import { PASSWORD_HINT, isPasswordValid } from "@/lib/passwordRules";

export default function ResetPasswordPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => (searchParams.get("token") ?? "").trim(), [searchParams]);
  const tenantLabel = useMemo(() => searchParams.get("tenant") ?? "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) return;
    if (!isPasswordValid(password)) {
      setErrorMessage(PASSWORD_HINT);
      return;
    }
    if (password !== confirm) {
      setErrorMessage("Passwords do not match.");
      return;
    }
    setErrorMessage(null);
    setSubmitting(true);
    try {
      await apiPost("/api/v1/auth/reset-password", { token, newPassword: password });
      setDone(true);
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : "Reset failed. Request a new link.");
    } finally {
      setSubmitting(false);
    }
  }

  if (!token) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          <h1 className="font-h2 text-primary mb-2">Invalid reset link</h1>
          <p className="text-slate-600 text-sm mb-6">Open the link from your email, or request a new reset.</p>
          <Link to="/forgot-password" className="text-primary font-semibold hover:underline">
            Forgot password
          </Link>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-slate-50">
        <div className="max-w-md bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center">
          <span className="material-symbols-outlined text-5xl text-teal-600 mb-4">check_circle</span>
          <h1 className="font-h2 text-primary mb-2">Password updated</h1>
          <p className="text-slate-600 text-sm mb-6">You can sign in with your new password.</p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center w-full bg-primary-container text-white font-semibold py-3 rounded-lg hover:opacity-90"
          >
            Go to login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md w-full bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
        <h1 className="font-h2 text-primary mb-1">Set new password</h1>
        {tenantLabel ? (
          <p className="text-xs text-slate-500 mb-4 font-mono">Tenant: {tenantLabel}</p>
        ) : (
          <p className="text-sm text-slate-600 mb-4">Choose a strong password for your account.</p>
        )}
        <form className="space-y-4" onSubmit={handleSubmit}>
          {errorMessage && (
            <div className="p-3 text-sm rounded-lg bg-red-50 border border-red-200 text-red-800">{errorMessage}</div>
          )}
          <div>
            <label className="block text-xs font-label-caps text-slate-500 mb-1 uppercase" htmlFor="np">
              New password
            </label>
            <input
              id="np"
              type="password"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">{PASSWORD_HINT}</p>
          </div>
          <div>
            <label className="block text-xs font-label-caps text-slate-500 mb-1 uppercase" htmlFor="cp">
              Confirm
            </label>
            <input
              id="cp"
              type="password"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          <button
            type="submit"
            disabled={submitting || !isPasswordValid(password) || password !== confirm}
            className="w-full bg-primary-container text-white font-semibold py-3 rounded-lg disabled:opacity-50"
          >
            {submitting ? "Updating…" : "Update password"}
          </button>
        </form>
        <Link to="/login" className="block text-center text-sm text-primary mt-6 hover:underline">
          Back to login
        </Link>
      </div>
    </div>
  );
}
