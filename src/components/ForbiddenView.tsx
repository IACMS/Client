import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

type Props = {
  /** i18n key for the resource name (preferred). */
  resourceKey?: string;
  /** Short, human-readable name when no key is provided. */
  resource?: string;
  detail?: string;
  backTo?: string;
  backLabelKey?: string;
};

export default function ForbiddenView({
  resourceKey,
  resource,
  detail,
  backTo = "/dashboard",
  backLabelKey = "errors.backToDashboard",
}: Props) {
  const { t } = useTranslation();
  const resourceLabel = resourceKey ? t(resourceKey) : (resource ?? t("errors.resourceFallback"));

  return (
    <div className="p-gutter max-w-2xl mx-auto w-full text-center pb-10">
      <div className="bg-white border border-outline-variant rounded-xl p-xl shadow-sm">
        <span className="material-symbols-outlined text-5xl text-slate-300 inline-block" aria-hidden>
          lock
        </span>
        <h1 className="font-h2 text-primary mt-2 mb-2">{t("errors.accessRestricted")}</h1>
        <p className="font-body-md text-slate-600 mb-2">{t("errors.noPermissionFor", { resource: resourceLabel })}</p>
        {detail ? <p className="text-sm text-slate-500 italic mb-2">{detail}</p> : null}
        <p className="text-sm text-slate-500 mb-6">{t("errors.contactAdmin")}</p>
        <Link
          to={backTo}
          className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-primary-container transition-colors"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          {t(backLabelKey)}
        </Link>
      </div>
    </div>
  );
}
