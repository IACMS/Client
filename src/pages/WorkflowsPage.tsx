import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import { apiGet, isAbortError } from "@/lib/api";
import CreateWorkflowModal from "@/components/CreateWorkflowModal";
import Can from "@/permissions/Can";
import { usePermissions } from "@/permissions/usePermissions";

type ApiWorkflow = {
  id: string;
  key: string;
  name: string;
  description?: string;
  departmentId?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  version: number;
  updatedAt: string;
};

type WorkflowsResponse = { workflows?: ApiWorkflow[] };

export default function WorkflowsPage() {
  const { t } = useTranslation();
  const { user } = useSession();
  const tenantId = user?.tenant?.id ?? user?.tenantId;
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canConfigure = can("workflows:update");
  const [workflows, setWorkflows] = useState<ApiWorkflow[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ok" | "error">("loading");
  const [createOpen, setCreateOpen] = useState(false);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      if (!tenantId) {
        setLoadState("error");
        return;
      }
      try {
        const data = (await apiGet(`/api/v1/workflows?tenantId=${tenantId}`, {
          signal: ac.signal,
        })) as WorkflowsResponse;
        if (!ac.signal.aborted) {
          setWorkflows(data.workflows || []);
          setLoadState("ok");
        }
      } catch (e) {
        if (isAbortError(e) || ac.signal.aborted) return;
        setLoadState("error");
      }
    })();
    return () => ac.abort();
  }, [tenantId]);

  return (
    <div className="p-gutter max-w-7xl mx-auto w-full pb-10">
      <CreateWorkflowModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        userId={user?.id}
        onCreated={(wf) => navigate(`/workflows/${wf.id}/designer`)}
      />
      <div className="mb-8 flex justify-between items-end flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 font-label-caps text-xs mb-2 flex-wrap">
            <span>{t("portal.breadcrumb.portal")}</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-primary font-bold">{t("portal.breadcrumb.workflows")}</span>
          </div>
          <h1 className="font-h1 text-primary">{t("workflows.title")}</h1>
          <p className="font-body-md text-slate-600 mt-1">{t("workflows.subtitle")}</p>
        </div>
        <Can permission="workflows:create">
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            disabled={!tenantId}
            className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-primary-container transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className="material-symbols-outlined">add</span>
            {t("workflows.create")}
          </button>
        </Can>
      </div>

      {loadState === "loading" && <div className="p-12 text-center text-slate-500"><span className="material-symbols-outlined animate-spin text-3xl">sync</span></div>}
      
      {loadState === "ok" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {workflows.map(wf => (
            <div key={wf.id} className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm hover:shadow-md transition-shadow flex flex-col">
              <div className="flex justify-between items-start mb-4">
                <span className={`px-2 py-1 rounded text-xs font-bold ${wf.status === 'PUBLISHED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'}`}>
                  {wf.status}
                </span>
                <span className="text-xs text-slate-400 font-mono">v{wf.version}</span>
              </div>
              <h3 className="font-h3 text-slate-800 mb-2">{wf.name}</h3>
              <p className="text-sm text-slate-500 mb-6 flex-1">{wf.description}</p>
              <p className="text-xs text-slate-400 mb-4">
                Scope: {wf.departmentId ? "Department-specific" : "Tenant-wide"}
              </p>
              
              <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
                <span className="text-xs text-slate-400">{t("workflows.keyLabel", { key: wf.key })}</span>
                <Link to={`/workflows/${wf.id}/designer`} className="text-primary hover:text-teal-700 font-semibold text-sm flex items-center gap-1">
                  {wf.status === 'DRAFT' ? t("workflows.openDesigner") : t("workflows.viewGraph")}
                  <span className="material-symbols-outlined text-sm">arrow_forward</span>
                </Link>
              </div>
            </div>
          ))}
          {workflows.length === 0 && (
            <div className="col-span-full bg-slate-50 border border-dashed border-slate-300 rounded-xl p-12 text-center space-y-4">
              <p className="text-slate-500">
                {canConfigure
                  ? t("workflows.empty.canConfigure")
                  : t("workflows.empty.readOnly")}
              </p>
              <Can permission="workflows:create">
                <button
                  type="button"
                  onClick={() => setCreateOpen(true)}
                  disabled={!tenantId}
                  className="inline-flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-lg font-semibold hover:bg-primary-container disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-lg">add</span>
                  {t("workflows.create")}
                </button>
              </Can>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
