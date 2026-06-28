import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { ApiError, apiPost } from "@/lib/api";

export default function VerifyEmailPage() {
  const { t } = useTranslation();
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
        setMessage(t("auth.verifyEmail.success"));
      } catch (err) {
        setStatus("err");
        setMessage(err instanceof ApiError ? err.message : t("auth.verifyEmail.failed"));
      }
    })();
  }, [token, t]);

  if (!token) {
    return (
      <div className="min-h-dvh flex items-center justify-center p-6 relative">
        <div className="absolute top-4 right-4 z-10">
          <LanguageSwitcher />
        </div>
        <div className="max-w-md text-center">
          <p className="text-slate-600 mb-4">{t("auth.verifyEmail.missingToken")}</p>
          <Link to="/login" className="text-primary font-semibold hover:underline">
            {t("auth.verifyEmail.login")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-slate-50 relative">
      <div className="absolute top-4 right-4 z-10">
        <LanguageSwitcher />
      </div>
      <div className="max-w-md bg-white border border-slate-200 rounded-xl p-8 shadow-sm text-center">
        <h1 className="font-h2 text-primary mb-4">{t("auth.verifyEmail.title")}</h1>
        {(status === "idle" || status === "loading") && <p className="text-slate-600">{t("auth.verifyEmail.verifying")}</p>}
        {(status === "ok" || status === "err") && message && (
          <p className={status === "ok" ? "text-teal-800" : "text-red-700"}>{message}</p>
        )}
        <Link to="/login" className="inline-block mt-6 text-sm text-primary hover:underline">
          {t("auth.verifyEmail.goToLogin")}
        </Link>
      </div>
    </div>
  );
}
