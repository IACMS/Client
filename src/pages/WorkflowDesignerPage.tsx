import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ApiError, apiDelete, apiGet, apiPost } from "@/lib/api";
import WorkflowStepModal, { type WorkflowStepEditPayload } from "@/components/WorkflowStepModal";
import WorkflowTransitionModal, { type WorkflowTransitionEditPayload } from "@/components/WorkflowTransitionModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { fetchRbacRoles, roleNamesForIds, type RbacRoleRow } from "@/lib/workflowRoles";
import { validateWorkflowForPublish } from "@/lib/workflowPublishValidate";

type WorkflowStep = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  isInitial: boolean;
  isFinal: boolean;
  requiresAttachment?: boolean;
  position: number;
  allowedRoleIds?: string[];
};
type WorkflowTransition = {
  id: string;
  fromStepId: string;
  toStepId: string;
  name: string;
  description?: string | null;
  requiresComment: boolean;
  allowedRoleIds?: string[];
};
type ApiWorkflow = {
  id: string;
  name: string;
  status: string;
  version?: number;
  steps: WorkflowStep[];
  transitions: WorkflowTransition[];
};

export default function WorkflowDesignerPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [workflow, setWorkflow] = useState<ApiWorkflow | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ok" | "error">("loading");
  const [stepModalOpen, setStepModalOpen] = useState(false);
  const [stepEditing, setStepEditing] = useState<WorkflowStepEditPayload | null>(null);
  const [transitionModalOpen, setTransitionModalOpen] = useState(false);
  const [transitionEditing, setTransitionEditing] = useState<WorkflowTransitionEditPayload | null>(null);
  const [deleteDraftOpen, setDeleteDraftOpen] = useState(false);
  const [deleteDraftBusy, setDeleteDraftBusy] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);
  const [publishBusy, setPublishBusy] = useState(false);
  const [publishMessage, setPublishMessage] = useState("");
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rbacRoles, setRbacRoles] = useState<RbacRoleRow[]>([]);

  const loadWorkflow = useCallback(async () => {
    if (!id) return;
    setLoadError(null);
    try {
      const data = (await apiGet(`/api/v1/workflows/${encodeURIComponent(id)}/full`)) as {
        workflow?: ApiWorkflow;
      };
      const wf = data?.workflow;
      if (!wf || !Array.isArray(wf.steps) || !Array.isArray(wf.transitions)) {
        setLoadError("Invalid response from server (missing workflow steps).");
        setWorkflow(null);
        setLoadState("error");
        return;
      }
      setWorkflow({
        ...wf,
        steps: wf.steps,
        transitions: wf.transitions,
      });
      setLoadState("ok");
      setBannerError(null);
    } catch (e) {
      setWorkflow(null);
      setLoadState("error");
      setLoadError(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Request failed. Check that the API is running and you are signed in.",
      );
    }
  }, [id]);

  useEffect(() => {
    void loadWorkflow();
  }, [loadWorkflow]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const list = await fetchRbacRoles();
      if (!cancelled) setRbacRoles(list);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function openAddStep() {
    setStepEditing(null);
    setStepModalOpen(true);
  }

  function openEditStep(step: WorkflowStep) {
    setStepEditing({
      id: step.id,
      name: step.name,
      key: step.key,
      description: step.description ?? "",
      isInitial: step.isInitial,
      isFinal: step.isFinal,
      requiresAttachment: Boolean(step.requiresAttachment),
      allowedRoleIds: step.allowedRoleIds ?? [],
    });
    setStepModalOpen(true);
  }

  function closeStepModal() {
    setStepModalOpen(false);
    setStepEditing(null);
  }

  function openAddTransition() {
    setTransitionEditing(null);
    setTransitionModalOpen(true);
  }

  function openEditTransition(t: WorkflowTransition) {
    setTransitionEditing({
      id: t.id,
      name: t.name,
      description: t.description ?? "",
      fromStepId: t.fromStepId,
      toStepId: t.toStepId,
      requiresComment: t.requiresComment,
      allowedRoleIds: t.allowedRoleIds ?? [],
    });
    setTransitionModalOpen(true);
  }

  function closeTransitionModal() {
    setTransitionModalOpen(false);
    setTransitionEditing(null);
  }

  async function deleteTransitionRow(t: WorkflowTransition) {
    if (!id || workflow?.status !== "DRAFT") return;
    if (!confirm(`Remove transition “${t.name}”?`)) return;
    try {
      await apiDelete(`/api/v1/workflows/${encodeURIComponent(id)}/transitions/${encodeURIComponent(t.id)}`);
      await loadWorkflow();
    } catch (err) {
      setBannerError(err instanceof ApiError ? err.message : "Could not delete transition.");
    }
  }

  async function createNewVersionFromThis() {
    if (!id) return;
    setBannerError(null);
    try {
      const res = (await apiPost(`/api/v1/workflows/${encodeURIComponent(id)}/new-version`, {})) as {
        workflow?: { id: string };
      };
      const newId = res.workflow?.id;
      if (!newId) {
        setBannerError("Could not create new version.");
        return;
      }
      navigate(`/workflows/${encodeURIComponent(newId)}/designer`, { replace: true });
      void loadWorkflow();
    } catch (err) {
      setBannerError(err instanceof ApiError ? err.message : "Could not create new version.");
    }
  }

  async function confirmDeleteDraft() {
    if (!id) return;
    setDeleteDraftBusy(true);
    setBannerError(null);
    try {
      await apiDelete(`/api/v1/workflows/${encodeURIComponent(id)}`);
      setDeleteDraftOpen(false);
      navigate("/workflows");
    } catch (err) {
      setBannerError(err instanceof ApiError ? err.message : "Could not delete draft.");
      setDeleteDraftOpen(false);
    } finally {
      setDeleteDraftBusy(false);
    }
  }

  function requestPublish() {
    if (!workflow) return;
    setBannerError(null);
    const { blocking, warnings } = validateWorkflowForPublish(workflow.steps, workflow.transitions);
    if (blocking.length > 0) {
      setBannerError(blocking.join(" "));
      return;
    }
    const base =
      "Once published, this workflow definition can no longer be edited. Older published versions of the same key are archived; existing cases stay on the workflow version they were created with.";
    const warnText =
      warnings.length > 0 ? `\n\nWarnings:\n${warnings.map((w) => `• ${w}`).join("\n")}` : "";
    setPublishMessage(base + warnText);
    setPublishOpen(true);
  }

  async function handlePublishConfirm() {
    if (!id) return;
    setPublishBusy(true);
    setBannerError(null);
    try {
      await apiPost(`/api/v1/workflows/${id}/publish`, {});
      setPublishOpen(false);
      navigate("/workflows");
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Publish failed. Ensure you have exactly one initial step.";
      setBannerError(msg);
      setPublishOpen(false);
    } finally {
      setPublishBusy(false);
    }
  }

  if (loadState === "loading")
    return (
      <div className="p-12 text-center text-slate-500">
        <span className="material-symbols-outlined animate-spin text-3xl">sync</span>
      </div>
    );
  if (loadState === "error" || !workflow)
    return (
      <div className="p-12 max-w-lg mx-auto text-center space-y-4">
        <p className="text-red-600 font-semibold">Could not load this workflow</p>
        {loadError && (
          <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-4 text-left whitespace-pre-wrap">
            {loadError}
          </p>
        )}
        <p className="text-xs text-slate-500">
          If the message mentions a missing column or database error, apply pending migrations from the IACMS repo:{" "}
          <code className="font-mono bg-slate-100 px-1 rounded">npx prisma migrate deploy</code>
        </p>
        <Link to="/workflows" className="inline-block text-primary font-semibold hover:underline">
          ← Back to workflows
        </Link>
      </div>
    );

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-slate-50 overflow-hidden">
      {id && (
        <>
          <WorkflowStepModal
            open={stepModalOpen}
            onClose={closeStepModal}
            workflowId={id}
            editStep={stepEditing}
            onSaved={loadWorkflow}
          />
          <WorkflowTransitionModal
            open={transitionModalOpen}
            onClose={closeTransitionModal}
            workflowId={id}
            steps={workflow.steps.map((s) => ({
              id: s.id,
              key: s.key,
              name: s.name,
              isFinal: s.isFinal,
            }))}
            chainTransitionOptions={workflow.transitions
              .filter((t) => t.id !== transitionEditing?.id)
              .map((t) => {
                const fromS = workflow.steps.find((s) => s.id === t.fromStepId);
                const toS = workflow.steps.find((s) => s.id === t.toStepId);
                return {
                  id: t.id,
                  toStepId: t.toStepId,
                  label: `${t.name} (${fromS?.name ?? "?"} → ${toS?.name ?? "?"})`,
                };
              })}
            editTransition={transitionEditing}
            onSaved={loadWorkflow}
          />
        </>
      )}
      <ConfirmDialog
        open={publishOpen}
        title="Publish workflow?"
        message={publishMessage}
        confirmLabel="Publish"
        variant="primary"
        busy={publishBusy}
        onCancel={() => !publishBusy && setPublishOpen(false)}
        onConfirm={handlePublishConfirm}
      />
      <ConfirmDialog
        open={deleteDraftOpen}
        title="Delete this draft?"
        message="This removes the draft workflow only if no cases use it. You can create a new version again from a published copy."
        confirmLabel="Delete draft"
        variant="danger"
        busy={deleteDraftBusy}
        onCancel={() => !deleteDraftBusy && setDeleteDraftOpen(false)}
        onConfirm={() => void confirmDeleteDraft()}
      />

      <div className="bg-white border-b border-outline-variant p-4 flex justify-between items-center shrink-0 shadow-sm z-10">
        <div>
          <nav className="flex text-[10px] font-label-caps text-secondary mb-1 gap-x-2">
            <Link to="/workflows" className="hover:text-primary">
              WORKFLOWS
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
            <button
              type="button"
              onClick={() => void createNewVersionFromThis()}
              className="px-4 py-2 bg-primary text-white rounded text-sm font-semibold hover:bg-teal-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">difference</span>
              New version (editable draft)
            </button>
          )}
          {workflow.status === "DRAFT" && (
            <>
              <button
                type="button"
                onClick={openAddStep}
                className="px-4 py-2 bg-white border border-slate-300 rounded text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">add_circle</span> Add step
              </button>
              <button
                type="button"
                onClick={openAddTransition}
                className="px-4 py-2 bg-white border border-slate-300 rounded text-sm font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">moving</span> Add transition
              </button>
              <button
                type="button"
                onClick={() => setDeleteDraftOpen(true)}
                className="px-4 py-2 bg-white border border-red-200 text-red-800 rounded text-sm font-semibold hover:bg-red-50 transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">delete</span> Abandon draft
              </button>
              <button
                type="button"
                onClick={requestPublish}
                className="px-4 py-2 bg-primary text-white rounded text-sm font-semibold hover:bg-teal-700 transition-colors flex items-center gap-2 shadow-sm"
              >
                <span className="material-symbols-outlined text-[18px]">publish</span> Publish
              </button>
            </>
          )}
        </div>
      </div>

      {bannerError && (
        <div className="shrink-0 mx-4 mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex justify-between gap-3 items-start">
          <span>{bannerError}</span>
          <button type="button" className="text-red-900 font-semibold shrink-0" onClick={() => setBannerError(null)}>
            Dismiss
          </button>
        </div>
      )}

      <div className="flex-1 p-6 overflow-auto bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] relative">
        {workflow.steps.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-400">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-50">account_tree</span>
            <p className="text-lg">Canvas is empty</p>
            <p className="text-sm">Add a step to begin designing.</p>
            {workflow.status === "DRAFT" && (
              <button
                type="button"
                onClick={openAddStep}
                className="mt-6 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-container"
              >
                Add first step
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
            {workflow.steps.map((step) => {
              const stepRoles = roleNamesForIds(rbacRoles, step.allowedRoleIds);
              return (
                <div
                  key={step.id}
                  className={`bg-white border-2 rounded-xl p-4 shadow-sm relative ${
                    step.isInitial ? "border-teal-500" : step.isFinal ? "border-amber-500" : "border-slate-200"
                  }`}
                >
                  {workflow.status === "DRAFT" && (
                    <button
                      type="button"
                      onClick={() => openEditStep(step)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                      aria-label="Edit step"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                    </button>
                  )}
                  {step.isInitial && (
                    <div className="absolute -top-3 left-4 bg-teal-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      INITIAL
                    </div>
                  )}
                  {step.isFinal && (
                    <div className="absolute -top-3 left-4 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                      FINAL
                    </div>
                  )}

                  <h3 className="font-bold text-slate-800 mt-2 pr-10">{step.name}</h3>
                  <p className="text-[10px] text-slate-400 font-mono mb-2">key: {step.key}</p>
                  {step.requiresAttachment && (
                    <p className="text-[10px] font-semibold text-teal-800 bg-teal-50 border border-teal-100 rounded px-2 py-1 mb-2 inline-flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">attach_file</span>
                      Attachment required to proceed
                    </p>
                  )}
                  {stepRoles.length > 0 ? (
                    <p className="text-[10px] text-slate-600 mb-3">
                      <span className="font-semibold">Roles:</span> {stepRoles.join(", ")}
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 mb-3">Roles: any</p>
                  )}

                  <div className="space-y-2 border-t border-slate-100 pt-3">
                    <p className="text-xs font-label-caps text-slate-500">OUTGOING TRANSITIONS</p>
                    {workflow.transitions.filter((t) => t.fromStepId === step.id).length === 0 && (
                      <p className="text-xs text-slate-400 italic">None</p>
                    )}
                    {workflow.transitions
                      .filter((t) => t.fromStepId === step.id)
                      .map((t) => {
                        const target = workflow.steps.find((s) => s.id === t.toStepId);
                        const trRoles = roleNamesForIds(rbacRoles, t.allowedRoleIds);
                        return (
                          <div
                            key={t.id}
                            className="bg-slate-50 border border-slate-200 rounded p-2 text-xs flex flex-col gap-1"
                          >
                            <div className="flex justify-between items-start gap-2">
                              <div className="flex justify-between items-center gap-2 flex-1 min-w-0">
                                <span className="font-semibold text-primary truncate">{t.name}</span>
                                <span className="flex items-center gap-1 text-slate-500 shrink-0">
                                  <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                                  {target?.name}
                                </span>
                              </div>
                              {workflow.status === "DRAFT" && (
                                <div className="flex gap-0.5 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => openEditTransition(t)}
                                    className="p-1 rounded text-slate-600 hover:bg-slate-200"
                                    aria-label="Edit transition"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">edit</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => void deleteTransitionRow(t)}
                                    className="p-1 rounded text-red-700 hover:bg-red-100"
                                    aria-label="Delete transition"
                                  >
                                    <span className="material-symbols-outlined text-[16px]">close</span>
                                  </button>
                                </div>
                              )}
                            </div>
                            {trRoles.length > 0 ? (
                              <span className="text-[10px] text-slate-500">Execute: {trRoles.join(", ")}</span>
                            ) : (
                              <span className="text-[10px] text-slate-400">Execute: any role</span>
                            )}
                          </div>
                        );
                      })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
