import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Can from "@/permissions/Can";
import type { ApiWorkflow } from "@/hooks/useWorkflow";

type Props = {
  workflow: ApiWorkflow;
  onAddStep: () => void;
  onAddTransition: () => void;
  onAbandonDraft: () => void;
  onPublish: () => void;
  onCreateNewVersion: () => void;
};

/**
 * Header chrome for the workflow designer: breadcrumbs + title + draft/publish
 * actions. All mutation buttons are gated by `workflows:configure` / `:publish`
 * so non-admins never see them even if they reach the route.
 */
export default function WorkflowDesignerHeader({
  workflow,
  onAddStep,
  onAddTransition,
  onAbandonDraft,
  onPublish,
  onCreateNewVersion,
}: Props) {
  const { t } = useTranslation();
  return (
    <div className="bg-white border-b border-outline-variant p-4 flex justify-between items-center shrink-0 shadow-sm z-10">
      <div>
        <nav className="flex text-[10px] font-label-caps text-secondary mb-1 gap-x-2">
          <Link to="/workflows" className="hover:text-primary">
            {t("portal.breadcrumb.workflows")}
          </Link>
          <span>/</span>
          <span className="text-primary font-bold">DESIGNER</span>
        </nav>
        <h1 className="font-h2 text-slate-800 flex items-center gap-2 flex-wrap">
          {workflow.name}
          <span className="text-xs font-mono text-slate-500">v{workflow.version ?? 1}</span>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
              workflow.status === "PUBLISHED"
                ? "bg-emerald-100 text-emerald-800"
                : workflow.status === "ARCHIVED"
                  ? "bg-amber-100 text-amber-900"
                  : "bg-slate-100 text-slate-600"
            }`}
          >
            {workflow.status}
          </span>
        </h1>
      </div>
      <div className="flex gap-2 flex-wrap">
        {workflow.status !== "DRAFT" && (
          <Can permission="workflows:update">
            <button
              type="button"
              onClick={onCreateNewVersion}
              className="px-4 py-2 bg-primary text-white rounded text-sm font-semibold hover:bg-teal-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">difference</span>
              New version (editable draft)
            </button>
          </Can>
        )}
        {workflow.status === "DRAFT" && (
          <Can permission="workflows:update">
            <button
              type="button"
              onClick={onAddStep}
              className="px-4 py-2 bg-white border border-slate-300 rounded text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span> Add step
            </button>
            <button
              type="button"
              onClick={onAddTransition}
              className="px-4 py-2 bg-white border border-slate-300 rounded text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">moving</span> {t("modals.workflow.addTransition")}
            </button>
            <button
              type="button"
              onClick={onAbandonDraft}
              className="px-4 py-2 bg-white border border-red-200 text-red-800 rounded text-sm font-semibold hover:bg-red-50 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">delete</span> {t("workflows.designer.deleteDraft")}
            </button>
            <Can permission="workflows:update">
              <button
                type="button"
                onClick={onPublish}
                className="px-4 py-2 bg-primary text-white rounded text-sm font-semibold hover:bg-teal-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">publish</span> {t("workflows.designer.publish")}
              </button>
            </Can>
          </Can>
        )}
      </div>
    </div>
  );
}
