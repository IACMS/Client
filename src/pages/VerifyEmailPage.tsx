import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ApiError, apiPost } from "@/lib/api";

export default function VerifyEmailPage() {
  const [searchParams] = useSearchParams();
  const token = useMemo(() => (searchParams.get("token") ?? "").trim(), [searchParams]);
  const [status, setStatus] = useState<"idle" | "loading" | "ok" | "err">("idle");
  const [message, setMessage] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (!token || started.current) return;
    started.current = true;
    setStatus("loading");
    setMessage(null);
    (async () => {
      try {
        await apiPost("/api/v1/auth/verify-email", { token });
        setStatus("ok");
        setMessage("Email verified successfully. You can sign in.");
      } catch (err) {
        setStatus("err");
        setMessage(err instanceof ApiError ? err.message : "Verification failed.");
      }
    })();
  }, [token]);

  if (!token) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6">
        <div className="max-w-md text-center">
          <p className="text-slate-600 mb-4">Missing verification token.</p>
          <Link to="/login" className="text-primary font-semibold hover:underline">
            Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-slate-50">
      <div className="max-w-md bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center">
        <h1 className="font-h2 text-primary mb-4">Verify email</h1>
        {(status === "idle" || status === "loading") && <p className="text-slate-600">Verifying…</p>}
        {(status === "ok" || status === "err") && message && (
          <p className={status === "ok" ? "text-teal-800" : "text-red-700"}>{message}</p>
        )}
        <Link to="/login" className="inline-block mt-6 text-sm text-primary hover:underline">
          Go to login
        </Link>
      </div>
    </div>
  );
}
