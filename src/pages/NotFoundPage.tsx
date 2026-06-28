import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

export default function NotFoundPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-gutter text-on-surface font-body-md">
      <p className="font-label-caps text-secondary tracking-widest mb-2">404</p>
      <h1 className="font-h2 text-primary mb-2 text-center">{t("errors.notFoundTitle")}</h1>
      <p className="text-secondary text-center max-w-md mb-xl">{t("errors.notFoundBody")}</p>
      <div className="flex flex-wrap gap-md justify-center">
        <Link className="bg-primary-container text-white px-lg py-md rounded-lg font-semibold hover:opacity-90" to="/">
          {t("common.home")}
        </Link>
        <Link className="border border-outline px-lg py-md rounded-lg font-semibold text-primary-container hover:bg-slate-50" to="/login">
          {t("nav.signIn")}
        </Link>
      </div>
    </div>
  );
}
