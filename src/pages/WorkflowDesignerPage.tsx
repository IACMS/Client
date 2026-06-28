import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ApiError, apiDelete, apiPost } from "@/lib/api";
import WorkflowStepModal, { type WorkflowStepEditPayload } from "@/components/WorkflowStepModal";
import WorkflowTransitionModal, {
  type WorkflowTransitionEditPayload,
} from "@/components/WorkflowTransitionModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import ForbiddenView from "@/components/ForbiddenView";
import WorkflowDesignerHeader from "@/components/workflow-designer/WorkflowDesignerHeader";
import WorkflowDesignerCanvas from "@/components/workflow-designer/WorkflowDesignerCanvas";
import { usePermissions } from "@/permissions/usePermissions";
import { fetchRbacRoles, prepareRolesForWorkflowPickers, type RbacRoleRow } from "@/lib/workflowRoles";
import { validateWorkflowForPublish } from "@/lib/workflowPublishValidate";
import { useWorkflow, type WorkflowStep, type WorkflowTransition } from "@/hooks/useWorkflow";

export default function WorkflowDesignerPage() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { can } = usePermissions();
  const canConfigure = can("workflows:update");

  const { workflow, loadState, loadError, reload } = useWorkflow(id);

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
  const [deleteTransition, setDeleteTransition] = useState<WorkflowTransition | null>(null);
  const [deleteTransitionBusy, setDeleteTransitionBusy] = useState(false);
  const [rbacRoles, setRbacRoles] = useState<RbacRoleRow[]>([]);

  useEffect(() => {
    const tid = workflow?.tenantId;
    if (!tid) return;
    let cancelled = false;
    void (async () => {
      const list = prepareRolesForWorkflowPickers(await fetchRbacRoles({ tenantId: tid }));
      if (!cancelled) setRbacRoles(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [workflow?.tenantId]);

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
      timeLimitType: t.timeLimitType ?? "NONE",
      timeLimitAmount: t.timeLimitAmount ?? null,
      timeLimitUnit: t.timeLimitUnit ?? null,
    });
    setTransitionModalOpen(true);
  }

  function closeTransitionModal() {
    setTransitionModalOpen(false);
    setTransitionEditing(null);
  }

  async function confirmDeleteTransition() {
    if (!id || !deleteTransition || workflow?.status !== "DRAFT") return;
    setDeleteTransitionBusy(true);
    try {
      await apiDelete(
        `/api/v1/workflows/${encodeURIComponent(id)}/transitions/${encodeURIComponent(deleteTransition.id)}`,
      );
      setDeleteTransition(null);
      await reload();
    } catch (err) {
      setBannerError(err instanceof ApiError ? err.message : t("workflows.designer.deleteTransitionFailed"));
      setDeleteTransition(null);
    } finally {
      setDeleteTransitionBusy(false);
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
        setBannerError(t("workflows.designer.newVersionFailed"));
        return;
      }
      navigate(`/workflows/${encodeURIComponent(newId)}/designer`, { replace: true });
      void reload();
    } catch (err) {
      setBannerError(err instanceof ApiError ? err.message : t("workflows.designer.newVersionFailed"));
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
      setBannerError(err instanceof ApiError ? err.message : t("workflows.designer.deleteDraftFailed"));
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
    const base = t("workflows.designer.publishMessage");
    const warnText =
      warnings.length > 0
        ? `\n\n${t("workflows.designer.publishWarnings")}\n${warnings.map((w) => `• ${w}`).join("\n")}`
        : "";
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
            : t("workflows.designer.publishFailed");
      setBannerError(msg);
      setPublishOpen(false);
    } finally {
      setPublishBusy(false);
    }
  }

  if (loadState === "loading") {
    return (
      <div className="p-12 text-center text-slate-500">
        <span className="material-symbols-outlined animate-spin text-3xl">sync</span>
      </div>
    );
  }
  if (loadState === "forbidden") {
    return (
      <ForbiddenView
        resourceKey="workflows.designer.forbiddenResource"
        detail={loadError ?? undefined}
        backTo="/workflows"
        backLabelKey="workflows.designer.backLabel"
      />
    );
  }
  if (loadState === "error" || !workflow) {
    return (
      <div className="p-12 max-w-lg mx-auto text-center space-y-4">
        <p className="text-red-600 font-semibold">{t("workflows.designer.loadFailedTitle")}</p>
        {loadError && (
          <p className="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-4 text-left whitespace-pre-wrap">
            {loadError}
          </p>
        )}
        <p className="text-xs text-slate-500">
          {t("workflows.designer.migrationHint")}{" "}
          <code className="font-mono bg-slate-100 px-1 rounded">npx prisma migrate deploy</code>
        </p>
        <Link to="/workflows" className="inline-block text-primary font-semibold hover:underline">
          {t("workflows.designer.backToWorkflows")}
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col h-[calc(100vh-4rem)] bg-slate-50 overflow-hidden">
      {id && (
        <>
          <WorkflowStepModal
            open={stepModalOpen}
            onClose={closeStepModal}
            workflowTenantId={workflow.tenantId}
            workflowId={id}
            editStep={stepEditing}
            onSaved={reload}
          />
          <WorkflowTransitionModal
            open={transitionModalOpen}
            onClose={closeTransitionModal}
            workflowTenantId={workflow.tenantId}
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
            onSaved={reload}
          />
        </>
      )}
      <ConfirmDialog
        open={publishOpen}
        title={t("workflows.designer.publishTitle")}
        message={publishMessage}
        confirmLabel={t("workflows.designer.publish")}
        variant="primary"
        busy={publishBusy}
        onCancel={() => !publishBusy && setPublishOpen(false)}
        onConfirm={handlePublishConfirm}
      />
      <ConfirmDialog
        open={deleteDraftOpen}
        title={t("workflows.designer.deleteDraftTitle")}
        message={t("workflows.designer.deleteDraftMessage")}
        confirmLabel={t("workflows.designer.deleteDraft")}
        variant="danger"
        busy={deleteDraftBusy}
        onCancel={() => !deleteDraftBusy && setDeleteDraftOpen(false)}
        onConfirm={() => void confirmDeleteDraft()}
      />
      <ConfirmDialog
        open={!!deleteTransition}
        title={t("workflows.designer.deleteTransitionTitle")}
        message={
          deleteTransition
            ? t("workflows.designer.deleteTransitionMessage", { name: deleteTransition.name })
            : ""
        }
        confirmLabel={t("workflows.designer.delete")}
        variant="danger"
        busy={deleteTransitionBusy}
        onCancel={() => !deleteTransitionBusy && setDeleteTransition(null)}
        onConfirm={() => void confirmDeleteTransition()}
      />

      <WorkflowDesignerHeader
        workflow={workflow}
        onAddStep={openAddStep}
        onAddTransition={openAddTransition}
        onAbandonDraft={() => setDeleteDraftOpen(true)}
        onPublish={requestPublish}
        onCreateNewVersion={() => void createNewVersionFromThis()}
      />

      {!canConfigure && (
        <div className="shrink-0 mx-4 mt-3 p-3 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 text-sm">
          <span className="font-semibold">{t("workflows.designer.readOnlyBanner")}</span>{" "}
          {t("workflows.designer.readOnlyBody")}
        </div>
      )}

      {bannerError && (
        <div className="shrink-0 mx-4 mt-3 p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-sm flex justify-between gap-3 items-start">
          <span>{bannerError}</span>
          <button type="button" className="text-red-900 font-semibold shrink-0" onClick={() => setBannerError(null)}>
            {t("common.dismiss")}
          </button>
        </div>
      )}

      <WorkflowDesignerCanvas
        workflow={workflow}
        rbacRoles={rbacRoles}
        canConfigure={canConfigure}
        onAddStep={openAddStep}
        onEditStep={openEditStep}
        onEditTransition={openEditTransition}
        onDeleteTransition={(t) => setDeleteTransition(t)}
      />
    </div>
  );
}
