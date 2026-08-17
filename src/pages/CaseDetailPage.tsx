import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { TFunction } from "i18next";
import { Link, useParams } from "react-router-dom";
import CaseReferralsPanel from "@/components/CaseReferralsPanel";
import CaseTaskProgressView from "@/components/CaseTaskProgressView";
import CaseWorkflowGuidePanel, { type WorkflowGuideStep } from "@/components/CaseWorkflowGuidePanel";
import ExecuteTransitionModal from "@/components/ExecuteTransitionModal";
import TransitionLetterModal, { type TransitionLetterResult } from "@/components/TransitionLetterModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import WriteRichAttachmentModal from "@/components/WriteRichAttachmentModal";
import FileStatusBadge from "@/components/files/FileStatusBadge";
import ForbiddenView from "@/components/ForbiddenView";
import { useSession } from "@/context/SessionContext";
import { useCaseFileUpload } from "@/hooks/useCaseFileUpload";
import { usePermissions } from "@/permissions/usePermissions";
import { ApiError, apiDelete, apiGet, apiPost, getApiBase, isAbortError } from "@/lib/api";
import {
  buildCaseReportHtml,
  downloadCaseReportHtml,
  exportCaseReportPdf,
  type CaseReportInput,
} from "@/lib/caseReport";
import type { ApiCase } from "@/lib/casesApi";
import type { ApiReferral } from "@/lib/referralsApi";
import {
  formatCaseUpdated,
  isIncomingPendingReferral,
  priorityDisplay,
  statusBadgeClass,
  tenantHoldsCaseCustody,
} from "@/lib/casesApi";
import {
  deleteFile as deleteFmsFile,
  downloadFile,
  fmsFilePath,
  FMS_CASE_SERVICE,
  FMS_MODULE_LETTER,
  openFileView,
  parseFmsFileId,
  uploadAndWaitAvailable,
} from "@/lib/filesApi";
import { fetchRbacRoles, roleNamesForIds, type RbacRoleRow } from "@/lib/workflowRoles";

type CaseDetailResponse = { case?: ApiCase };

type CaseHistoryRow = {
  id: string;
  transition?: { name?: string; id?: string } | null;
  actor?: { firstName?: string; lastName?: string } | null;
  comment?: string | null;
  transitionedAt: string;
  fromStep?: { id: string; name: string; key: string } | null;
  toStep?: { id: string; name: string; key: string } | null;
};

type AvailableAction = {
  id: string;
  name: string;
  toStepId: string;
  requiresComment: boolean;
  allowedRoleIds?: string[];
  toStep?: { id: string; name: string; key: string } | null;
  timeLimitType?: string;
  timeLimitAmount?: number | null;
  timeLimitUnit?: string | null;
  deadlineAt?: string | null;
  isPastDue?: boolean;
};

type CaseState = {
  currentStep: {
    id: string;
    name: string;
    key: string;
    isInitial: boolean;
    isFinal: boolean;
    requiresAttachment?: boolean;
    allowedRoleIds?: string[];
  } | null;
  availableActions: AvailableAction[];
  history: CaseHistoryRow[];
  workflowGuide?: {
    steps: WorkflowGuideStep[];
    transitions: { id: string; name: string; fromStepId: string; toStepId: string }[];
  } | null;
  /** Sender-safe progress when another tenant currently holds the case custody. */
  senderProgress?: { range?: string; lastUpdatedAt?: string | null } | null;
};

type ApiAssignmentRow = {
  id: string;
  caseId: string;
  assignedTo: string;
  assignedBy: string;
  assignmentType?: string;
  notes?: string | null;
  assignee?: { id?: string; firstName?: string; lastName?: string; email?: string };
};

type ApiAttachmentRow = {
  id: string;
  filename: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  filePath: string;
  description?: string | null;
  workflowStepId?: string | null;
  uploader?: { firstName?: string; lastName?: string };
};

type TenantUserOption = { id: string; email: string; firstName: string; lastName: string; isActive: boolean };

type Tab = "summary" | "progress" | "activity" | "referrals" | "assignment" | "attachments";

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function transitionTimingCaption(action: AvailableAction, t: TFunction): string | null {
  const type = action.timeLimitType;
  const amt = action.timeLimitAmount;
  const unit = action.timeLimitUnit;
  if (!type || type === "NONE" || amt == null || amt < 1 || (unit !== "HOURS" && unit !== "DAYS")) return null;
  const unitLabel = unit === "DAYS" ? t("cases.detail.timing.dayUnit") : t("cases.detail.timing.hourUnit");
  const label = type === "DEADLINE" ? t("cases.detail.timing.deadline") : t("cases.detail.timing.suggestedTarget");
  if (action.deadlineAt) {
    const when = new Date(action.deadlineAt);
    const overdue = action.isPastDue;
    const suffix =
      overdue && type === "DEADLINE"
        ? t("cases.detail.timing.exceededBlocked")
        : overdue
          ? t("cases.detail.timing.exceededGuidance")
          : "";
    return `${label}: ${when.toLocaleString()}${suffix}`;
  }
  return t("cases.detail.timing.within", { label, amount: amt, unit: unitLabel });
}

export default function CaseDetailPage() {
  const { t } = useTranslation();
  const { user } = useSession();
  const sessionTenantId = user?.tenant?.id ?? user?.tenantId;
  const { can } = usePermissions();
  const { caseId } = useParams();
  const decodedId = useMemo(() => (caseId ? decodeURIComponent(caseId) : ""), [caseId]);
  const [tab, setTab] = useState<Tab>("summary");
  const [caseRow, setCaseRow] = useState<ApiCase | null>(null);
  const [caseState, setCaseState] = useState<CaseState | null>(null);
  const [attachmentsList, setAttachmentsList] = useState<ApiAttachmentRow[]>([]);
  const [assignmentsList, setAssignmentsList] = useState<ApiAssignmentRow[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUserOption[]>([]);
  const [assignUserId, setAssignUserId] = useState("");
  const [assignType, setAssignType] = useState("manual");
  const [assignNotes, setAssignNotes] = useState("");
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [attachmentDesc, setAttachmentDesc] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [writeModalOpen, setWriteModalOpen] = useState(false);
  const [attachmentFileActionId, setAttachmentFileActionId] = useState<string | null>(null);
  const [removeAttachmentId, setRemoveAttachmentId] = useState<string | null>(null);
  const [removeAttachmentBusy, setRemoveAttachmentBusy] = useState(false);
  const caseFileUpload = useCaseFileUpload();
  const [unassignId, setUnassignId] = useState<string | null>(null);
  const [unassignBusy, setUnassignBusy] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "ok" | "error" | "forbidden">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rbacRoles, setRbacRoles] = useState<RbacRoleRow[]>([]);
  const [execModal, setExecModal] = useState<{
    transitionId: string;
    actionName: string;
    targetStepName?: string;
    requiresComment: boolean;
  } | null>(null);
  const [execSubmitting, setExecSubmitting] = useState(false);
  const [execError, setExecError] = useState<string | null>(null);
  const [postTransitionSuccess, setPostTransitionSuccess] = useState<{
    transitionName: string;
    destinationStepName?: string;
  } | null>(null);
  const [scrollNextActionsPending, setScrollNextActionsPending] = useState(false);
  const [reportBusy, setReportBusy] = useState(false);
  const [reportMsg, setReportMsg] = useState<string | null>(null);

  const loadCase = useCallback(
    async (signal?: AbortSignal) => {
      if (!decodedId) return;
      setLoadState("loading");
      setErrorMessage(null);
      try {
        const [data, stateData, attPayload, assignPayload] = await Promise.all([
          apiGet(`/api/v1/cases/${decodedId}`, { signal }),
          apiGet(`/api/v1/cases/${decodedId}/state`, { signal }),
          apiGet(`/api/v1/attachments/case/${decodedId}`, { signal }).catch(() => null),
          apiGet(`/api/v1/assignments?caseId=${encodeURIComponent(decodedId)}`, { signal }).catch(
            () => null,
          ),
        ]);
        if (signal?.aborted) return;
        const detail = data as CaseDetailResponse;
        if (!detail.case) throw new Error("Invalid response: no case");
        setCaseRow(detail.case);
        setCaseState(stateData as CaseState);

        if (attPayload && typeof attPayload === "object" && "attachments" in attPayload) {
          setAttachmentsList(
            Array.isArray((attPayload as { attachments: ApiAttachmentRow[] }).attachments)
              ? (attPayload as { attachments: ApiAttachmentRow[] }).attachments
              : [],
          );
        } else {
          setAttachmentsList([]);
        }
        if (assignPayload && typeof assignPayload === "object" && "assignments" in assignPayload) {
          setAssignmentsList(
            Array.isArray((assignPayload as { assignments: ApiAssignmentRow[] }).assignments)
              ? (assignPayload as { assignments: ApiAssignmentRow[] }).assignments
              : [],
          );
        } else {
          setAssignmentsList([]);
        }

        setLoadState("ok");
      } catch (e) {
        if (isAbortError(e)) return;
        if (e instanceof ApiError && e.status === 403) {
          setErrorMessage(e.message);
          setCaseRow(null);
          setLoadState("forbidden");
          return;
        }
        const msg =
          e instanceof ApiError
            ? e.status === 404
              ? t("cases.detail.notFound")
              : e.message
            : e instanceof Error
              ? e.message
              : t("cases.detail.loadFailed");
        setErrorMessage(msg);
        setCaseRow(null);
        setLoadState("error");
      }
    },
    [decodedId, t],
  );

  useEffect(() => {
    const ac = new AbortController();
    void loadCase(ac.signal);
    return () => ac.abort();
  }, [loadCase]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!sessionTenantId) {
        const list = await fetchRbacRoles();
        if (!cancelled) setRbacRoles(list);
        return;
      }
      const list = await fetchRbacRoles({ tenantId: sessionTenantId });
      if (!cancelled) setRbacRoles(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionTenantId]);

  useEffect(() => {
    if (tab !== "assignment" || !decodedId) return;
    const ac = new AbortController();
    (async () => {
      try {
        const raw = (await apiGet("/api/v1/auth/users", { signal: ac.signal })) as {
          users?: TenantUserOption[];
        };
        if (!ac.signal.aborted) setTenantUsers(raw.users ?? []);
      } catch (e) {
        if (isAbortError(e)) return;
        if (!ac.signal.aborted) setTenantUsers([]);
      }
    })();
    return () => ac.abort();
  }, [tab, decodedId]);

  useEffect(() => {
    if (!scrollNextActionsPending || tab !== "progress") return;
    const t = window.setTimeout(() => {
      const el = document.getElementById("case-next-actions");
      el?.scrollIntoView({ behavior: "smooth", block: "start" });
      el?.focus({ preventScroll: true });
      setScrollNextActionsPending(false);
    }, 120);
    return () => window.clearTimeout(t);
  }, [tab, scrollNextActionsPending]);

  const openExecuteModal = (action: AvailableAction) => {
    setPostTransitionSuccess(null);
    setExecError(null);
    setExecModal({
      transitionId: action.id,
      actionName: action.name,
      targetStepName: action.toStep?.name,
      requiresComment: action.requiresComment,
    });
  };

  const registerLetterAttachment = async (letter: TransitionLetterResult) => {
    const blob = new Blob([letter.html], { type: "text/html;charset=utf-8" });
    const safe = letter.filename.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const fmsFile = await uploadAndWaitAvailable({
      file: blob,
      filename: safe.endsWith(".html") ? safe : `${safe}.html`,
      service: FMS_CASE_SERVICE,
      module: FMS_MODULE_LETTER,
      referenceId: decodedId,
    });
    await apiPost("/api/v1/attachments", {
      caseId: decodedId,
      filename: safe,
      originalFilename: fmsFile.originalName || safe,
      mimeType: fmsFile.mimeType || "text/html",
      fileSize: fmsFile.size,
      filePath: fmsFilePath(fmsFile.id),
      description: `Transition letter: ${execModal?.actionName ?? "workflow action"}`,
      ...(caseState?.currentStep?.id ? { workflowStepId: caseState.currentStep.id } : {}),
    });
  };

  const executeTransitionPost = async (comment?: string) => {
    if (!execModal || !decodedId) return;
    setExecError(null);
    setExecSubmitting(true);
    const snapshot = {
      transitionName: execModal.actionName,
      destinationStepName: execModal.targetStepName,
    };
    try {
      await apiPost(`/api/v1/cases/${decodedId}/transitions/${execModal.transitionId}/execute`, {
        ...(comment?.trim() ? { comment: comment.trim() } : {}),
      });
      setExecModal(null);
      await loadCase();
      setPostTransitionSuccess(snapshot);
    } catch (e) {
      setExecError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : t("cases.detail.transitionFailed"));
    } finally {
      setExecSubmitting(false);
    }
  };

  const executeTransitionWithLetter = async (letter: TransitionLetterResult) => {
    if (!execModal || !decodedId) return;
    setExecError(null);
    setExecSubmitting(true);
    const snapshot = {
      transitionName: execModal.actionName,
      destinationStepName: execModal.targetStepName,
    };
    try {
      await apiPost(`/api/v1/cases/${decodedId}/transitions/${execModal.transitionId}/execute`, {
        comment: letter.plainText,
      });
      if (letter.attachToCase) {
        try {
          await registerLetterAttachment(letter);
        } catch {
          setExecError(t("cases.detail.letterAttachFailed"));
          setExecModal(null);
          await loadCase();
          setPostTransitionSuccess(snapshot);
          return;
        }
      }
      setExecModal(null);
      await loadCase();
      setPostTransitionSuccess(snapshot);
    } catch (e) {
      setExecError(e instanceof ApiError ? e.message : e instanceof Error ? e.message : t("cases.detail.transitionFailed"));
    } finally {
      setExecSubmitting(false);
    }
  };

  function goToNextActions() {
    setTab("progress");
    setScrollNextActionsPending(true);
  }

  const attachmentsCount = attachmentsList.length;
  const pr = caseRow ? priorityDisplay(caseRow.priority) : null;

  const submitAssignment = async () => {
    setAssignError(null);
    if (!assignUserId) {
      setAssignError(t("cases.detail.selectUserError"));
      return;
    }
    setAssignBusy(true);
    try {
      await apiPost("/api/v1/assignments", {
        caseId: decodedId,
        assignedTo: assignUserId,
        assignmentType: assignType.trim() || "manual",
        notes: assignNotes.trim() || undefined,
      });
      setAssignNotes("");
      await loadCase();
    } catch (e) {
      setAssignError(e instanceof ApiError ? e.message : t("cases.detail.assignmentFailed"));
    } finally {
      setAssignBusy(false);
    }
  };

  const confirmUnassign = async () => {
    if (!unassignId) return;
    setUnassignBusy(true);
    setAssignError(null);
    try {
      await apiPost(`/api/v1/assignments/${unassignId}/unassign`, {});
      setUnassignId(null);
      await loadCase();
    } catch (e) {
      setAssignError(e instanceof ApiError ? e.message : t("cases.detail.unassignFailed"));
      setUnassignId(null);
    } finally {
      setUnassignBusy(false);
    }
  };

  const submitAttachment = async () => {
    setAttachmentError(null);
    if (!attachmentFile) {
      setAttachmentError(t("cases.detail.chooseFileError"));
      return;
    }
    setAttachmentBusy(true);
    try {
      const fmsFile = await caseFileUpload.upload({
        file: attachmentFile,
        caseId: decodedId,
      });
      const safe = attachmentFile.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
      await apiPost("/api/v1/attachments", {
        caseId: decodedId,
        filename: `${Date.now()}-${safe}`,
        originalFilename: attachmentFile.name,
        mimeType: fmsFile.mimeType || attachmentFile.type || "application/octet-stream",
        fileSize: fmsFile.size,
        filePath: fmsFilePath(fmsFile.id),
        description: attachmentDesc.trim() || undefined,
        ...(caseState?.currentStep?.id ? { workflowStepId: caseState.currentStep.id } : {}),
      });
      setAttachmentDesc("");
      setAttachmentFile(null);
      caseFileUpload.reset();
      await loadCase();
    } catch (e) {
      if (isAbortError(e)) return;
      setAttachmentError(
        e instanceof ApiError
          ? e.message
          : caseFileUpload.error || t("cases.detail.attachmentFailed"),
      );
    } finally {
      setAttachmentBusy(false);
    }
  };

  const handleViewAttachment = async (att: ApiAttachmentRow) => {
    const fileId = parseFmsFileId(att.filePath);
    if (!fileId) return;
    setAttachmentFileActionId(att.id);
    setAttachmentError(null);
    try {
      await openFileView(fileId);
    } catch (e) {
      setAttachmentError(e instanceof ApiError ? e.message : t("cases.detail.viewFailed"));
    } finally {
      setAttachmentFileActionId(null);
    }
  };

  const handleDownloadAttachment = async (att: ApiAttachmentRow) => {
    const fileId = parseFmsFileId(att.filePath);
    if (!fileId) return;
    setAttachmentFileActionId(att.id);
    setAttachmentError(null);
    try {
      await downloadFile(fileId, att.originalFilename || att.filename);
    } catch (e) {
      setAttachmentError(e instanceof ApiError ? e.message : t("cases.detail.downloadFailed"));
    } finally {
      setAttachmentFileActionId(null);
    }
  };

  const confirmRemoveAttachment = async () => {
    if (!removeAttachmentId) return;
    setRemoveAttachmentBusy(true);
    setAttachmentError(null);
    try {
      const att = attachmentsList.find((a) => a.id === removeAttachmentId);
      const fmsId = att ? parseFmsFileId(att.filePath) : null;
      if (fmsId) {
        try {
          await deleteFmsFile(fmsId);
        } catch {
          /* best-effort: still remove case attachment row */
        }
      }
      await apiDelete(`/api/v1/attachments/${removeAttachmentId}`);
      setRemoveAttachmentId(null);
      await loadCase();
    } catch (e) {
      setAttachmentError(e instanceof ApiError ? e.message : t("cases.detail.deleteFailed"));
      setRemoveAttachmentId(null);
    } finally {
      setRemoveAttachmentBusy(false);
    }
  };

  const stepRoleLabels = useMemo(() => {
    const ids = caseState?.currentStep?.allowedRoleIds;
    return roleNamesForIds(rbacRoles, ids);
  }, [caseState?.currentStep?.allowedRoleIds, rbacRoles]);

  const stepNameById = useMemo(() => {
    const steps = caseState?.workflowGuide?.steps;
    if (!steps?.length) return new Map<string, string>();
    return new Map(steps.map((s) => [s.id, s.name]));
  }, [caseState?.workflowGuide?.steps]);

  const buildReportInput = useCallback(
    (referrals: ApiReferral[]): CaseReportInput => {
      const tenant = user?.tenant;
      const template = tenant?.config ?? {};
      const rawLogo = template.logoUrl;
      const logoUrl =
        rawLogo && typeof rawLogo === "string"
          ? rawLogo.startsWith("http")
            ? rawLogo
            : `${getApiBase()}${rawLogo}`
          : undefined;
      return {
        case: caseRow!,
        currentStep: caseState?.currentStep ?? caseRow!.currentStep ?? null,
        workflowGuide: caseState?.workflowGuide ?? null,
        history: caseState?.history ?? [],
        assignments: assignmentsList,
        attachments: attachmentsList,
        referrals,
        stepNameById,
        generatedBy: user
          ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email
          : undefined,
        organizationName: tenant?.name ?? "Organization",
        template: {
          letterHeader: template.letterHeader,
          letterFooter: template.letterFooter,
          letterAddress: template.letterAddress,
          primaryColor: template.primaryColor,
        },
        logoUrl,
      };
    },
    [assignmentsList, attachmentsList, caseRow, caseState, stepNameById, user],
  );

  const exportReport = useCallback(
    async (mode: "pdf" | "html") => {
      if (!caseRow) return;
      setReportBusy(true);
      setReportMsg(null);
      try {
        const q = new URLSearchParams({ caseId: caseRow.id });
        const refPayload = (await apiGet(`/api/v1/referrals?${q}`).catch(() => null)) as {
          referrals?: ApiReferral[];
        } | null;
        const referrals = Array.isArray(refPayload?.referrals) ? refPayload.referrals : [];
        const html = buildCaseReportHtml(buildReportInput(referrals));
        if (mode === "pdf") {
          exportCaseReportPdf(html);
          setReportMsg(t("cases.detail.exportPdfSuccess"));
        } else {
          downloadCaseReportHtml(html, caseRow.caseNumber);
          setReportMsg(t("cases.detail.exportHtmlSuccess"));
        }
      } catch (e) {
        setReportMsg(e instanceof Error ? e.message : t("cases.detail.exportFailed"));
      } finally {
        setReportBusy(false);
      }
    },
    [buildReportInput, caseRow, t],
  );

  const attachmentBlocked = useMemo(() => {
    const cid = caseState?.currentStep?.id;
    if (!cid || !caseState?.currentStep?.requiresAttachment) return false;
    return attachmentsList.filter((a) => a.workflowStepId === cid).length < 1;
  }, [attachmentsList, caseState?.currentStep?.id, caseState?.currentStep?.requiresAttachment]);

  const currentStepAttachmentCount = useMemo(() => {
    const cid = caseState?.currentStep?.id;
    if (!cid) return 0;
    return attachmentsList.filter((a) => a.workflowStepId === cid).length;
  }, [attachmentsList, caseState?.currentStep?.id]);

  const caseClosed = (caseRow?.status ?? "").toLowerCase() === "closed";

  const incomingPendingReferral = isIncomingPendingReferral(caseRow, sessionTenantId);
  const holdsCustody = tenantHoldsCaseCustody(caseRow, sessionTenantId);
  const readOnlyCustody = Boolean(caseRow && sessionTenantId && !holdsCustody && !incomingPendingReferral);
  const workflowLocked = caseClosed || incomingPendingReferral || readOnlyCustody;

  // Role/state gating for write actions on the case detail tabs. The backend
  // is still authoritative; these flags just keep the UI from inviting the
  // user to attempt actions that will 403, and lock everything on closed cases.
  // Permission names mirror the gateway's RBAC route table — see
  // `IACMS/services/api-gateway/src/middleware/rbac.middleware.js`.
  const canAssign = can("cases:assign") && holdsCustody && !caseClosed && !incomingPendingReferral;
  const canUpload = can("file:upload") && holdsCustody && !caseClosed && !incomingPendingReferral;
  const canDeleteAttachment = can("file:delete") && holdsCustody && !caseClosed && !incomingPendingReferral;
  const canRefer = can("referrals:create") && holdsCustody && !caseClosed && !incomingPendingReferral;

  const transitionRoleLabels = useCallback((ids?: string[]) => roleNamesForIds(rbacRoles, ids), [rbacRoles]);

  if (loadState === "loading") {
    return (
      <div className="flex-1 p-lg max-w-7xl w-full mx-auto pb-10 flex flex-col items-center justify-center min-h-[320px] text-slate-600">
        <span className="material-symbols-outlined text-4xl animate-pulse">progress_activity</span>
        <p className="mt-3 font-body-sm">{t("cases.detail.loading")}</p>
      </div>
    );
  }

  if (loadState === "forbidden") {
    return (
      <ForbiddenView
        resourceKey="cases.detail.forbiddenResource"
        detail={errorMessage ?? undefined}
        backTo="/cases"
        backLabelKey="cases.detail.backToCases"
      />
    );
  }

  if (loadState === "error" || !caseRow) {
    return (
      <div className="flex-1 p-lg max-w-3xl w-full mx-auto pb-10">
        <div className="bg-white border border-outline-variant rounded-xl p-xl">
          <h1 className="font-h2 text-primary mb-2">{t("cases.detail.unavailableTitle")}</h1>
          <p className="font-body-md text-secondary mb-6">{errorMessage ?? t("cases.detail.unknownError")}</p>
          <Link to="/cases" className="text-primary font-semibold hover:underline">
            ← {t("cases.detail.backToCases")}
          </Link>
        </div>
      </div>
    );
  }

  const stClass = statusBadgeClass(caseRow.status);
  const creator = caseRow.creator;
  const creatorName =
    creator && typeof creator === "object" && "firstName" in creator
      ? `${String((creator as { firstName?: string }).firstName ?? "")} ${String((creator as { lastName?: string }).lastName ?? "")}`.trim()
      : "";

  return (
    <div className="flex-1 p-lg max-w-7xl w-full mx-auto pb-10">
      {execModal?.requiresComment ? (
        <TransitionLetterModal
          open
          onClose={() => !execSubmitting && setExecModal(null)}
          actionName={execModal.actionName}
          targetStepName={execModal.targetStepName}
          requiresLetter
          caseNumber={caseRow.caseNumber}
          caseTitle={caseRow.title}
          tenant={user?.tenant ?? null}
          signatoryName={
            user
              ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email
              : ""
          }
          submitting={execSubmitting}
          error={execError}
          onExecute={(letter) => void executeTransitionWithLetter(letter)}
        />
      ) : (
        <ExecuteTransitionModal
          open={!!execModal}
          onClose={() => !execSubmitting && setExecModal(null)}
          actionName={execModal?.actionName ?? ""}
          targetStepName={execModal?.targetStepName}
          requiresComment={false}
          submitting={execSubmitting}
          error={execError}
          onExecute={(c) => void executeTransitionPost(c)}
        />
      )}
      <ConfirmDialog
        open={!!removeAttachmentId}
        title={t("cases.detail.removeAttachmentTitle")}
        message={t("cases.detail.removeAttachmentMessage")}
        confirmLabel={t("cases.detail.remove")}
        variant="danger"
        busy={removeAttachmentBusy}
        onCancel={() => !removeAttachmentBusy && setRemoveAttachmentId(null)}
        onConfirm={() => void confirmRemoveAttachment()}
      />
      <ConfirmDialog
        open={!!unassignId}
        title={t("cases.detail.unassignTitle")}
        message={t("cases.detail.unassignMessage")}
        confirmLabel={t("cases.detail.unassign")}
        variant="danger"
        busy={unassignBusy}
        onCancel={() => !unassignBusy && setUnassignId(null)}
        onConfirm={() => void confirmUnassign()}
      />
      {incomingPendingReferral && (
        <div className="mb-4 p-4 rounded-xl border border-teal-200 bg-teal-50 text-teal-900 flex flex-wrap items-start justify-between gap-3">
          <div className="flex gap-2">
            <span className="material-symbols-outlined text-teal-700">move_to_inbox</span>
            <div>
              <p className="font-semibold">{t("cases.detail.incomingReferralTitle")}</p>
              <p className="text-sm text-teal-800/90 mt-0.5">
                {t("cases.detail.incomingReferralBody", {
                  agency: caseRow.tenant?.name ?? t("cases.detail.incomingReferralAgencyFallback"),
                })}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setTab("referrals")}
            className="text-sm font-semibold px-4 py-2 rounded-lg bg-primary text-white hover:bg-primary-container shrink-0"
          >
            {t("cases.detail.acceptReject")}
          </button>
        </div>
      )}
      {readOnlyCustody && (
        <div className="mb-4 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-900 text-sm">
          {t("cases.detail.readOnlyCustody")}
        </div>
      )}
      <div className="mb-lg">
        <nav className="flex text-label-caps text-secondary mb-2 uppercase tracking-widest flex-wrap gap-x-1">
          <Link to="/cases" className="hover:text-primary">
            {t("nav.cases")}
          </Link>
          <span className="mx-2">/</span>
          <span>{caseRow.tenant?.name ?? t("common.tenant")}</span>
          <span className="mx-2">/</span>
          <span className="text-primary font-bold">{caseRow.caseNumber}</span>
        </nav>
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h1 className="font-h1 text-h1 text-primary mb-1">{caseRow.title}</h1>
            <p className="font-body-md text-secondary">
              {caseRow.type} · {t("cases.detail.updated", { date: formatCaseUpdated(caseRow.updatedAt) })}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={reportBusy}
                onClick={() => void exportReport("pdf")}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-outline-variant bg-white text-sm font-semibold text-primary hover:bg-slate-50 disabled:opacity-50 shadow-sm"
                title={t("cases.detail.exportReportTitle")}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {reportBusy ? "progress_activity" : "picture_as_pdf"}
                </span>
                {reportBusy ? t("cases.detail.preparing") : t("cases.detail.exportReport")}
              </button>
              <button
                type="button"
                disabled={reportBusy}
                onClick={() => void exportReport("html")}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold text-secondary hover:text-primary hover:bg-slate-50 disabled:opacity-50"
                title={t("cases.detail.downloadHtmlTitle")}
              >
                <span className="material-symbols-outlined text-[16px]">download</span>
                {t("cases.detail.downloadHtml")}
              </button>
            </div>
            {reportMsg && (
              <p className="text-xs text-slate-600 max-w-xs text-right" role="status">
                {reportMsg}
              </p>
            )}
            <span className={`px-3 py-1 rounded-full text-label-caps font-bold border ${stClass}`}>
              {caseRow.status.toUpperCase()}
            </span>
            {workflowLocked && (
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 inline-flex items-center gap-1">
                <span className="material-symbols-outlined text-[14px]">lock</span>
                {incomingPendingReferral ? t("cases.detail.referralReview") : t("common.readOnly")}
              </span>
            )}
          </div>
        </div>
      </div>

      {postTransitionSuccess && (
        <div
          className="mb-lg rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 shadow-sm"
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-2 flex-1 min-w-0">
            <span className="material-symbols-outlined text-teal-700 shrink-0" aria-hidden>
              check_circle
            </span>
            <div>
              <p className="font-semibold text-teal-900">{t("cases.detail.transitionComplete")}</p>
              <p className="text-sm text-teal-900/90 mt-0.5">
                {postTransitionSuccess.destinationStepName ? (
                  t("cases.detail.transitionFinishedWithStep", {
                    name: postTransitionSuccess.transitionName,
                    step: postTransitionSuccess.destinationStepName,
                  })
                ) : (
                  t("cases.detail.transitionFinishedGeneric", {
                    name: postTransitionSuccess.transitionName,
                  })
                )}
              </p>
              <p className="text-xs text-teal-800/80 mt-2">{t("cases.detail.viewNextActionsHint")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button
              type="button"
              onClick={() => goToNextActions()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-teal-700 text-white text-sm font-semibold hover:bg-teal-800 transition-colors shadow-sm"
            >
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              {t("cases.detail.viewNextActions")}
            </button>
            <button
              type="button"
              onClick={() => setPostTransitionSuccess(null)}
              className="inline-flex items-center justify-center px-4 py-2 rounded-lg border border-teal-300 text-teal-900 text-sm font-semibold hover:bg-teal-100/80 transition-colors"
            >
              {t("common.dismiss")}
            </button>
          </div>
        </div>
      )}

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden min-h-[600px] flex flex-col shadow-sm">
        <div className="flex border-b border-outline-variant bg-surface-container-low overflow-x-auto">
          <TabBtn id="summary" active={tab} setTab={setTab} label={t("cases.detail.tab.summary")} />
          <TabBtn id="progress" active={tab} setTab={setTab} label={t("cases.detail.tab.progress")} />
          <TabBtn id="activity" active={tab} setTab={setTab} label={t("cases.detail.tab.activity")} />
          <TabBtn id="referrals" active={tab} setTab={setTab} label={t("cases.detail.tab.referrals")} />
          <TabBtn
            id="assignment"
            active={tab}
            setTab={setTab}
            label={
              assignmentsList.length > 0
                ? t("cases.detail.assignmentCount", { count: assignmentsList.length })
                : t("cases.detail.tab.assignment")
            }
          />
          <TabBtn
            id="attachments"
            active={tab}
            setTab={setTab}
            label={
              attachmentsCount > 0
                ? t("cases.detail.attachmentsCount", { count: attachmentsCount })
                : t("cases.detail.tab.attachments")
            }
          />
        </div>

        {tab === "progress" &&
          (caseState ? (
            <CaseTaskProgressView
              guide={caseState.workflowGuide}
              availableActions={caseState.availableActions}
              history={caseState.history}
              attachmentBlocked={attachmentBlocked}
              currentStepAttachmentCount={currentStepAttachmentCount}
              caseClosed={workflowLocked}
              onExecuteAction={openExecuteModal}
              transitionRoleLabels={transitionRoleLabels}
              senderProgress={caseState.senderProgress ?? null}
            />
          ) : (
            <div className="p-lg text-center text-secondary">{t("cases.detail.loadingWorkflow")}</div>
          ))}

        {tab === "summary" && (
          <div className="p-lg grid grid-cols-12 gap-lg flex-1">
            <div className="col-span-12 lg:col-span-8 grid grid-cols-2 gap-md">
              <div className="col-span-2 bg-white border border-outline-variant p-md rounded-lg shadow-sm">
                <h3 className="font-label-caps text-secondary mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">info</span>
                  {t("cases.detail.overview")}
                </h3>
                <p className="font-body-md text-on-surface leading-relaxed mb-4">
                  {caseRow.description?.trim() ? caseRow.description : t("cases.detail.noDescription")}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-lg border-t border-surface-variant pt-4">
                  <div>
                    <span className="text-label-caps text-secondary block mb-1">{t("common.priority")}</span>
                    <span className={`font-system-id font-bold flex items-center gap-1 ${pr?.textClass ?? ""}`}>
                      <span className="material-symbols-outlined text-xs">priority_high</span>
                      {caseRow.priority.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-label-caps text-secondary block mb-1">{t("cases.detail.caseType")}</span>
                    <span className="font-system-id text-on-surface">{caseRow.type}</span>
                  </div>
                  <div>
                    <span className="text-label-caps text-secondary block mb-1">{t("cases.detail.due")}</span>
                    <span className="font-system-id text-on-surface">
                      {caseRow.dueDate ? formatCaseUpdated(caseRow.dueDate) : "—"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-outline-variant p-md rounded-lg shadow-sm">
                <h3 className="font-label-caps text-secondary mb-3">{t("cases.detail.assignee")}</h3>
                {caseRow.assignee ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-sm shrink-0">
                      {`${caseRow.assignee.firstName ?? ""} ${caseRow.assignee.lastName ?? ""}`.trim().slice(0, 2).toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="font-body-sm font-bold text-on-surface">
                        {`${caseRow.assignee.firstName ?? ""} ${caseRow.assignee.lastName ?? ""}`.trim() || t("cases.detail.assignedUserFallback")}
                      </p>
                      <p className="text-xs text-secondary font-mono">{caseRow.assignee.email ?? caseRow.assignedTo}</p>
                    </div>
                  </div>
                ) : (
                  <p className="font-body-sm text-secondary">{t("cases.detail.noAssignee")}</p>
                )}
              </div>
              <div className="bg-white border border-outline-variant p-md rounded-lg shadow-sm">
                <h3 className="font-label-caps text-secondary mb-3">{t("cases.detail.creator")}</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm shrink-0">
                    {(creatorName || caseRow.createdBy || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-body-sm font-bold text-on-surface">{creatorName || t("common.unknown")}</p>
                    <p className="text-xs text-secondary font-mono">{caseRow.createdBy}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-outline-variant p-md rounded-lg shadow-sm">
                <h3 className="font-label-caps text-secondary mb-3">{t("cases.detail.tenant")}</h3>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-teal-700 bg-teal-50 p-2 rounded">account_balance</span>
                  <div>
                    <p className="font-body-sm font-bold text-on-surface">{caseRow.tenant?.name ?? "—"}</p>
                    <p className="text-xs text-secondary font-mono">{caseRow.tenant?.code ?? caseRow.tenantId}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 flex flex-col gap-lg">
              <div className="bg-white p-md rounded-lg border border-primary text-slate-800 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                <h3 className="font-label-caps text-primary pb-2 mb-4 flex justify-between items-center border-b border-slate-100">
                  {t("cases.detail.workflow")}
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                    bolt
                  </span>
                </h3>

                {(caseRow.workflow || caseRow.workflowId) && (
                  <div className="mb-4 text-xs text-slate-600 space-y-1">
                    <p>
                      <span className="font-label-caps text-slate-500">{t("cases.detail.definition")}</span>{" "}
                      <span className="font-semibold text-slate-800">{caseRow.workflow?.name ?? "—"}</span>
                      {caseRow.workflow?.key ? (
                        <span className="font-mono text-slate-500 ml-1">({caseRow.workflow.key})</span>
                      ) : null}
                    </p>
                    <p>
                      <span className="font-label-caps text-slate-500">{t("cases.detail.pinnedVersion")}</span>{" "}
                      <span className="font-mono font-semibold">v{caseRow.workflowVersion ?? caseRow.workflow?.version ?? "—"}</span>
                      {caseRow.workflow?.status ? (
                        <span className="ml-2 text-slate-500">· {caseRow.workflow.status}</span>
                      ) : null}
                    </p>
                  </div>
                )}

                <CaseWorkflowGuidePanel guide={caseState?.workflowGuide} />
                {caseState?.workflowGuide?.steps?.length ? (
                  <button
                    type="button"
                    onClick={() => setTab("progress")}
                    className="w-full mt-2 mb-4 py-2.5 text-sm font-semibold text-teal-800 bg-teal-50 border border-teal-200 rounded-lg hover:bg-teal-100 transition-colors flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-[18px]">account_tree</span>
                    {t("cases.detail.openFullProgress")}
                  </button>
                ) : null}

                {caseState?.currentStep ? (
                  <div className="mb-4">
                    <p className="text-xs text-slate-500 font-label-caps mb-1">{t("cases.detail.currentStep")}</p>
                    <p className="text-lg font-bold text-slate-800 flex items-center gap-2 flex-wrap">
                      {caseState.currentStep.name}
                      {caseState.currentStep.isFinal && (
                        <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase">
                          {t("cases.detail.terminal")}
                        </span>
                      )}
                      {caseState.currentStep.requiresAttachment && (
                        <span className="text-[10px] bg-teal-100 text-teal-900 px-2 py-0.5 rounded-full uppercase">
                          {t("cases.detail.needsFile")}
                        </span>
                      )}
                    </p>
                    <p className="text-[11px] text-slate-500 font-mono mt-1">
                      {t("cases.detail.stepKey", { key: caseState.currentStep.key })}
                    </p>
                    {caseState.currentStep.requiresAttachment && attachmentBlocked && (
                      <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg p-2 mt-2">
                        {t("cases.detail.attachmentRequiredWarning")}
                      </p>
                    )}
                    {stepRoleLabels.length > 0 ? (
                      <p className="text-xs text-slate-600 mt-2">
                        <span className="font-label-caps text-slate-500">{t("cases.detail.stepRoles")}</span>{" "}
                        {stepRoleLabels.join(", ")}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 mt-2">{t("cases.detail.noStepRoleRestriction")}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-sm opacity-90 mb-6 text-slate-500">{t("cases.detail.workflowNotStarted")}</p>
                )}

                {caseState?.availableActions && caseState.availableActions.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 font-label-caps mb-3">{t("cases.detail.availableActions")}</p>
                    <div className="flex flex-col gap-2">
                      {caseState.availableActions.map((action) => {
                        const restricted =
                          Array.isArray(action.allowedRoleIds) && action.allowedRoleIds.length > 0;
                        const deadlineBlocked =
                          action.timeLimitType === "DEADLINE" && Boolean(action.isPastDue);
                        const timingLine = transitionTimingCaption(action, t);
                        return (
                          <div key={action.id} className="space-y-1">
                            <button
                              type="button"
                              disabled={attachmentBlocked || workflowLocked || deadlineBlocked}
                              onClick={() => openExecuteModal(action)}
                              className="bg-primary text-white w-full py-2.5 rounded text-sm font-semibold hover:bg-teal-700 transition-colors flex justify-center items-center gap-2 shadow-sm disabled:opacity-45 disabled:pointer-events-none"
                            >
                              <span className="text-left">
                                {action.name}
                                {action.toStep?.name ? (
                                  <>
                                    {" "}
                                    <span className="opacity-90">→ {action.toStep.name}</span>
                                  </>
                                ) : null}
                              </span>
                              <span className="material-symbols-outlined text-[16px] shrink-0">arrow_forward</span>
                            </button>
                            {timingLine ? (
                              <p
                                className={`text-[10px] px-1 ${
                                  action.isPastDue && action.timeLimitType === "DEADLINE"
                                    ? "text-red-700"
                                    : action.isPastDue
                                      ? "text-amber-800"
                                      : "text-slate-500"
                                }`}
                              >
                                {timingLine}
                              </p>
                            ) : null}
                            {restricted ? (
                              <p className="text-[10px] text-slate-500 px-1">
                                {t("cases.detail.restricted", {
                                  roles: roleNamesForIds(rbacRoles, action.allowedRoleIds).join(", "),
                                })}
                              </p>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {caseState?.availableActions?.length === 0 && caseState?.currentStep && !caseState.currentStep.isFinal && (
                   <div className="bg-slate-50 p-3 rounded border border-slate-200 text-slate-500 text-xs">
                     {t("cases.detail.noActionsForRole")}
                   </div>
                )}
              </div>
              <div className="bg-white border border-outline-variant p-md rounded-lg shadow-sm">
                <h3 className="font-label-caps text-secondary mb-4">{t("cases.detail.attachmentsSummary")}</h3>
                {attachmentsCount === 0 ? (
                  <p className="text-body-sm text-secondary">{t("cases.detail.noAttachments")}</p>
                ) : (
                  <ul className="space-y-3">
                    {attachmentsList.map((att) => (
                      <li key={att.id}>
                        <span className="text-body-sm font-medium">{att.originalFilename ?? att.filename}</span>
                        <span className="text-xs text-secondary block">
                          {formatBytes(att.fileSize)}
                          {att.workflowStepId ? (
                            <span className="block text-teal-800 mt-0.5">
                              {t("cases.detail.stepLabel", {
                                name: stepNameById.get(att.workflowStepId) ?? att.workflowStepId.slice(0, 8) + "…",
                              })}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "activity" && (
           <div className="p-lg flex-1">
             <div className="max-w-3xl mx-auto">
               <h3 className="font-h3 text-slate-800 mb-6 flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary">history</span>
                  {t("cases.detail.timeline")}
               </h3>
               {caseState?.history && caseState.history.length > 0 ? (
                 <div className="space-y-6 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                    {caseState.history.map(item => (
                      <div key={item.id} className="relative pl-10">
                        <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-white border-2 border-primary flex items-center justify-center z-10">
                          <span className="material-symbols-outlined text-[16px] text-primary">swap_calls</span>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                          <div className="flex justify-between items-start mb-2 gap-2">
                            <span className="font-semibold text-slate-800">
                              {item.transition ? item.transition.name : t("cases.detail.caseOpened")}
                            </span>
                            <span className="text-xs text-slate-400 shrink-0">{formatCaseUpdated(item.transitionedAt)}</span>
                          </div>
                          {(item.fromStep || item.toStep) && (
                            <p className="text-xs text-teal-800 font-medium mb-2">
                              {item.fromStep ? (
                                <>
                                  {item.fromStep.name}
                                  <span className="text-slate-400 font-normal mx-1">→</span>
                                </>
                              ) : (
                                <span className="text-slate-500">{t("cases.detail.startArrow")} </span>
                              )}
                              {item.toStep ? item.toStep.name : "—"}
                            </p>
                          )}
                          {item.comment && (
                            <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded mb-2 italic">&quot;{item.comment}&quot;</p>
                          )}
                          <p className="text-xs text-slate-400">
                            {t("cases.detail.byActor", {
                              name: item.actor
                                ? `${item.actor.firstName} ${item.actor.lastName}`
                                : t("common.unknown"),
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                 </div>
               ) : (
                 <p className="text-slate-500">{t("cases.detail.noHistory")}</p>
               )}
             </div>
           </div>
        )}

        {tab === "referrals" && (!sessionTenantId || !user?.id) && (
          <div className="p-xl text-center text-secondary font-body-md">
            <p>{t("cases.detail.signInForReferrals")}</p>
          </div>
        )}
        {tab === "referrals" && sessionTenantId && user != null && (
          <CaseReferralsPanel
            caseId={caseRow.id}
            fromTenantId={sessionTenantId}
            userId={user.id}
            canCreate={canRefer && !incomingPendingReferral}
            onRefresh={() => {
              void loadCase();
            }}
          />
        )}

        {tab === "assignment" && (
          <div className="p-lg flex-1 max-w-3xl mx-auto w-full space-y-lg">
            <h3 className="font-h3 text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">person_search</span>
              {t("cases.detail.assignmentsTitle")}
            </h3>
            <p className="text-sm text-secondary">{t("cases.detail.assignmentsIntro")}</p>
            {!canAssign && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px]" aria-hidden>
                  {caseClosed ? "lock" : "shield_person"}
                </span>
                <span>
                  {caseClosed
                    ? t("cases.detail.closedReadOnlyAssignments")
                    : t("cases.detail.assignPermissionDenied")}
                </span>
              </div>
            )}
            {assignError && (
              <div
                className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
                role="alert"
              >
                {assignError}
              </div>
            )}
            {canAssign && (
              <div className="bg-white border border-outline-variant rounded-lg p-md shadow-sm space-y-md">
                <p className="font-label-caps text-secondary text-xs">{t("cases.detail.assignToUser")}</p>
                <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                  <select
                    className="flex-1 min-w-[200px] rounded-lg border border-outline-variant px-md py-sm text-body-sm"
                    value={assignUserId}
                    onChange={(e) => {
                      setAssignUserId(e.target.value);
                      setAssignError(null);
                    }}
                  >
                    <option value="">{t("cases.detail.selectUser")}</option>
                    {tenantUsers
                      .filter((u) => u.isActive)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.firstName} {u.lastName} ({u.email})
                        </option>
                      ))}
                  </select>
                  <input
                    className="w-full sm:w-40 rounded-lg border border-outline-variant px-md py-sm text-body-sm"
                    placeholder={t("cases.detail.typeOptional")}
                    value={assignType}
                    onChange={(e) => setAssignType(e.target.value)}
                  />
                </div>
                <textarea
                  className="w-full rounded-lg border border-outline-variant px-md py-sm text-body-sm min-h-[72px]"
                  placeholder={t("cases.detail.notesOptional")}
                  value={assignNotes}
                  onChange={(e) => setAssignNotes(e.target.value)}
                />
                <button
                  type="button"
                  disabled={assignBusy || !assignUserId}
                  onClick={() => void submitAssignment()}
                  className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
                >
                  {assignBusy ? t("cases.detail.assigning") : t("cases.detail.assignCase")}
                </button>
              </div>
            )}
            <div className="space-y-3">
              {assignmentsList.length === 0 ? (
                <p className="text-secondary text-sm">{t("cases.detail.noAssignments")}</p>
              ) : (
                assignmentsList.map((a) => (
                  <div
                    key={a.id}
                    className="bg-white border border-outline-variant rounded-lg p-md flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm"
                  >
                    <div>
                      <p className="font-semibold text-on-surface">
                        {a.assignee
                          ? `${a.assignee.firstName ?? ""} ${a.assignee.lastName ?? ""}`.trim()
                          : a.assignedTo}
                      </p>
                      <p className="text-xs text-secondary font-mono">{a.assignee?.email}</p>
                      {a.assignmentType && (
                        <p className="text-xs text-secondary mt-1">
                          {t("cases.detail.typeLabel", { type: a.assignmentType })}
                        </p>
                      )}
                      {a.notes && <p className="text-sm text-slate-600 mt-2 italic">&quot;{a.notes}&quot;</p>}
                    </div>
                    {canAssign && (
                      <button
                        type="button"
                        onClick={() => setUnassignId(a.id)}
                        className="text-sm font-semibold text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 shrink-0"
                      >
                        {t("cases.detail.unassign")}
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {tab === "attachments" && (
          <div className="p-lg flex-1 max-w-3xl mx-auto w-full space-y-lg">
            <h3 className="font-h3 text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">attach_file</span>
              {t("cases.detail.attachmentsTitle")}
            </h3>
            <p className="text-sm text-secondary">{t("cases.detail.attachmentsIntro")}</p>
            {!canUpload && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 flex items-start gap-2">
                <span className="material-symbols-outlined text-[16px]" aria-hidden>
                  {caseClosed ? "lock" : "shield_person"}
                </span>
                <span>
                  {caseClosed
                    ? t("cases.detail.closedReadOnlyAttachments")
                    : t("cases.detail.uploadPermissionDenied")}
                </span>
              </div>
            )}
            {attachmentError && (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">
                {attachmentError}
              </div>
            )}
            {canUpload && (
              <div className="bg-white border border-outline-variant rounded-lg p-md shadow-sm space-y-md">
                <input
                  type="file"
                  onChange={(e) => {
                    setAttachmentFile(e.target.files?.[0] ?? null);
                    setAttachmentError(null);
                    caseFileUpload.reset();
                  }}
                  className="block w-full text-sm text-slate-600"
                />
                {attachmentFile && (
                  <p className="text-xs text-secondary">
                    {attachmentFile.name} · {formatBytes(attachmentFile.size)}
                  </p>
                )}
                <textarea
                  className="w-full rounded-lg border border-outline-variant px-md py-sm text-body-sm min-h-[64px]"
                  placeholder={t("cases.detail.descriptionOptional")}
                  value={attachmentDesc}
                  onChange={(e) => setAttachmentDesc(e.target.value)}
                />
                {attachmentBusy && (
                  <div className="flex flex-wrap items-center gap-2 text-sm text-slate-600">
                    {caseFileUpload.status ? (
                      <FileStatusBadge status={caseFileUpload.status} />
                    ) : null}
                    <span>
                      {caseFileUpload.phase === "uploading"
                        ? caseFileUpload.chunkProgress
                          ? t("cases.detail.uploadingChunks", {
                              received: caseFileUpload.chunkProgress.receivedChunks,
                              total: caseFileUpload.chunkProgress.totalChunks,
                            })
                          : t("cases.detail.uploading")
                        : caseFileUpload.phase === "processing"
                          ? t("cases.detail.processingFile")
                          : t("cases.detail.saving")}
                    </span>
                  </div>
                )}
                <div className="flex flex-wrap gap-3 pt-2">
                  <button
                    type="button"
                    disabled={attachmentBusy || !attachmentFile}
                    onClick={() => void submitAttachment()}
                    className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50 inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base">upload_file</span>
                    {attachmentBusy ? t("cases.detail.uploading") : t("cases.detail.uploadAttachment")}
                  </button>

                  <button
                    type="button"
                    onClick={() => setWriteModalOpen(true)}
                    className="bg-teal-50 border border-teal-200 text-teal-800 px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-100 transition-colors inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-base text-teal-700">edit_note</span>
                    Write Document / Note (CKEditor)
                  </button>
                </div>
              </div>
            )}

            <WriteRichAttachmentModal
              open={writeModalOpen}
              onClose={() => setWriteModalOpen(false)}
              caseId={decodedId}
              workflowStepId={caseState?.currentStep?.id}
              onSaved={() => {
                void loadCase();
              }}
            />
            <ul className="divide-y divide-outline-variant border border-outline-variant rounded-lg overflow-hidden bg-white shadow-sm">
              {attachmentsList.length === 0 ? (
                <li className="p-md text-secondary text-sm">{t("cases.detail.noAttachmentsYet")}</li>
              ) : (
                attachmentsList.map((att) => {
                  const fmsId = parseFmsFileId(att.filePath);
                  const actionBusy = attachmentFileActionId === att.id;
                  return (
                    <li
                      key={att.id}
                      className="p-md flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-on-surface truncate">
                          {att.originalFilename ?? att.filename}
                        </p>
                        <p className="text-xs text-secondary">
                          {formatBytes(att.fileSize)} · {att.mimeType}
                          {att.uploader
                            ? ` · ${`${att.uploader.firstName ?? ""} ${att.uploader.lastName ?? ""}`.trim() || t("cases.detail.uploaderFallback")}`
                            : ""}
                          {att.workflowStepId ? (
                            <span className="inline-flex items-center gap-1 text-xs font-semibold text-teal-800 bg-teal-50 border border-teal-200 px-2 py-0.5 rounded-md mt-1.5">
                              <span className="material-symbols-outlined text-[14px]">insights</span>
                              {t("cases.detail.workflowStep", {
                                name:
                                  stepNameById.get(att.workflowStepId) ??
                                  att.workflowStepId.slice(0, 8) + "…",
                              })}
                            </span>
                          ) : null}
                          {!fmsId ? (
                            <span className="block text-slate-500 mt-1">
                              {t("cases.detail.metadataOnlyAttachment")}
                            </span>
                          ) : null}
                        </p>
                        {att.description && (
                          <p className="text-sm text-slate-600 mt-1">{att.description}</p>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
                        {fmsId ? (
                          <>
                            <button
                              type="button"
                              disabled={actionBusy}
                              onClick={() => void handleViewAttachment(att)}
                              className="text-sm font-semibold text-teal-800 border border-teal-200 px-3 py-1.5 rounded-lg hover:bg-teal-50 disabled:opacity-50"
                            >
                              {t("cases.detail.view")}
                            </button>
                            <button
                              type="button"
                              disabled={actionBusy}
                              onClick={() => void handleDownloadAttachment(att)}
                              className="text-sm font-semibold text-slate-700 border border-slate-200 px-3 py-1.5 rounded-lg hover:bg-slate-50 disabled:opacity-50"
                            >
                              {t("cases.detail.download")}
                            </button>
                          </>
                        ) : null}
                        {canDeleteAttachment && (
                          <button
                            type="button"
                            onClick={() => setRemoveAttachmentId(att.id)}
                            className="text-sm font-semibold text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50"
                          >
                            {t("cases.detail.remove")}
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}

function TabBtn({
  id,
  active,
  setTab,
  label,
}: {
  id: Tab;
  active: Tab;
  setTab: (t: Tab) => void;
  label: string;
}) {
  const isActive = active === id;
  return (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`px-lg py-4 font-label-caps shrink-0 transition-colors ${
        isActive ? "text-primary border-b-2 border-primary bg-white" : "text-secondary hover:text-primary bg-transparent"
      }`}
    >
      {label}
    </button>
  );
}
