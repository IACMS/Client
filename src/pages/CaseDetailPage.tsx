import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CaseReferralsPanel from "@/components/CaseReferralsPanel";
import { useSession } from "@/context/SessionContext";
import { ApiError, apiDelete, apiGet, apiPost } from "@/lib/api";
import type { ApiCase } from "@/lib/casesApi";
import { formatCaseUpdated, priorityDisplay, statusBadgeClass } from "@/lib/casesApi";

type CaseDetailResponse = { case?: ApiCase };
type CaseState = {
  currentStep: { id: string; name: string; key: string; isInitial: boolean; isFinal: boolean };
  availableActions: { id: string; name: string; toStepId: string; requiresComment: boolean }[];
  history: { id: string; transition: any; actor: any; comment: string; transitionedAt: string }[];
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
  uploader?: { firstName?: string; lastName?: string };
};

type TenantUserOption = { id: string; email: string; firstName: string; lastName: string; isActive: boolean };

type Tab = "summary" | "activity" | "referrals" | "assignment" | "attachments";

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export default function CaseDetailPage() {
  const { user } = useSession();
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
  const [attachmentDesc, setAttachmentDesc] = useState("");
  const [attachmentFile, setAttachmentFile] = useState<File | null>(null);
  const [attachmentBusy, setAttachmentBusy] = useState(false);
  const [loadState, setLoadState] = useState<"loading" | "ok" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCase = useCallback(async () => {
    if (!decodedId) return;
    setLoadState("loading");
    setErrorMessage(null);
    try {
      const [data, stateData, attPayload, assignPayload] = await Promise.all([
        apiGet(`/api/v1/cases/${decodedId}`),
        apiGet(`/api/v1/cases/${decodedId}/state`),
        apiGet(`/api/v1/attachments/case/${decodedId}`).catch(() => null),
        apiGet(`/api/v1/assignments?caseId=${encodeURIComponent(decodedId)}`).catch(() => null),
      ]);
      const detail = data as CaseDetailResponse;
      if (!detail.case) throw new Error("Invalid response: no case");
      setCaseRow(detail.case);
      setCaseState(stateData as CaseState);

      if (attPayload && typeof attPayload === "object" && "attachments" in attPayload) {
        setAttachmentsList(Array.isArray((attPayload as { attachments: ApiAttachmentRow[] }).attachments) ? (attPayload as { attachments: ApiAttachmentRow[] }).attachments : []);
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
      const msg = e instanceof ApiError ? (e.status === 404 ? "Case not found." : e.message) : e instanceof Error ? e.message : "Failed to load case.";
      setErrorMessage(msg);
      setCaseRow(null);
      setLoadState("error");
    }
  }, [decodedId]);

  useEffect(() => {
    void loadCase();
  }, [loadCase]);

  useEffect(() => {
    if (tab !== "assignment" || !decodedId) return;
    let cancelled = false;
    (async () => {
      try {
        const raw = (await apiGet("/api/v1/auth/users")) as { users?: TenantUserOption[] };
        if (!cancelled) setTenantUsers(raw.users ?? []);
      } catch {
        if (!cancelled) setTenantUsers([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tab, decodedId]);

  const handleAction = async (actionId: string, requiresComment: boolean) => {
    let comment = undefined;
    if (requiresComment) {
      comment = prompt("This transition requires a comment:");
      if (!comment) return;
    } else {
      comment = prompt("Optional comment:") || undefined;
    }
    
    try {
      await apiPost(`/api/v1/cases/${decodedId}/transitions/${actionId}/execute`, { comment });
      loadCase();
    } catch (e: any) {
      alert("Transition failed: " + (e.message || "Unknown error"));
    }
  };

  const attachmentsCount = attachmentsList.length;
  const pr = caseRow ? priorityDisplay(caseRow.priority) : null;

  const submitAssignment = async () => {
    if (!assignUserId) {
      alert("Select a user to assign.");
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
      alert(e instanceof ApiError ? e.message : "Assignment failed.");
    } finally {
      setAssignBusy(false);
    }
  };

  const unassign = async (assignmentId: string) => {
    try {
      await apiPost(`/api/v1/assignments/${assignmentId}/unassign`, {});
      await loadCase();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Unassign failed.");
    }
  };

  const submitAttachment = async () => {
    if (!attachmentFile) {
      alert("Choose a file to register as an attachment record.");
      return;
    }
    const safe = attachmentFile.name.replace(/[^a-zA-Z0-9._-]+/g, "_");
    const filename = `${Date.now()}-${safe}`;
    setAttachmentBusy(true);
    try {
      await apiPost("/api/v1/attachments", {
        caseId: decodedId,
        filename,
        originalFilename: attachmentFile.name,
        mimeType: attachmentFile.type || "application/octet-stream",
        fileSize: attachmentFile.size,
        filePath: `/uploads/metadata-only/${filename}`,
        description: attachmentDesc.trim() || undefined,
      });
      setAttachmentDesc("");
      setAttachmentFile(null);
      await loadCase();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Attachment registration failed.");
    } finally {
      setAttachmentBusy(false);
    }
  };

  const removeAttachment = async (id: string) => {
    if (!confirm("Remove this attachment from the case?")) return;
    try {
      await apiDelete(`/api/v1/attachments/${id}`);
      await loadCase();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Delete failed.");
    }
  };

  if (loadState === "loading") {
    return (
      <div className="flex-1 p-lg max-w-7xl w-full mx-auto pb-10 flex flex-col items-center justify-center min-h-[320px] text-slate-600">
        <span className="material-symbols-outlined text-4xl animate-pulse">progress_activity</span>
        <p className="mt-3 font-body-sm">Loading case…</p>
      </div>
    );
  }

  if (loadState === "error" || !caseRow) {
    return (
      <div className="flex-1 p-lg max-w-3xl w-full mx-auto pb-10">
        <div className="bg-white border border-outline-variant rounded-xl p-xl">
          <h1 className="font-h2 text-primary mb-2">Case unavailable</h1>
          <p className="font-body-md text-secondary mb-6">{errorMessage ?? "Unknown error."}</p>
          <Link to="/cases" className="text-primary font-semibold hover:underline">
            ← Back to cases
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
      <div className="mb-lg">
        <nav className="flex text-label-caps text-secondary mb-2 uppercase tracking-widest flex-wrap gap-x-1">
          <Link to="/cases" className="hover:text-primary">
            Cases
          </Link>
          <span className="mx-2">/</span>
          <span>{caseRow.tenant?.name ?? "Tenant"}</span>
          <span className="mx-2">/</span>
          <span className="text-primary font-bold">{caseRow.caseNumber}</span>
        </nav>
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h1 className="font-h1 text-h1 text-primary mb-1">{caseRow.title}</h1>
            <p className="font-body-md text-secondary">
              {caseRow.type} · Updated {formatCaseUpdated(caseRow.updatedAt)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1 rounded-full text-label-caps font-bold border ${stClass}`}>
              {caseRow.status.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden min-h-[600px] flex flex-col shadow-sm">
        <div className="flex border-b border-outline-variant bg-surface-container-low overflow-x-auto">
          <TabBtn id="summary" active={tab} setTab={setTab} label="SUMMARY" />
          <TabBtn id="activity" active={tab} setTab={setTab} label="ACTIVITY LOG" />
          <TabBtn id="referrals" active={tab} setTab={setTab} label="REFERRALS" />
          <TabBtn
            id="assignment"
            active={tab}
            setTab={setTab}
            label={
              assignmentsList.length > 0 ? `ASSIGNMENT (${assignmentsList.length})` : "ASSIGNMENT"
            }
          />
          <TabBtn
            id="attachments"
            active={tab}
            setTab={setTab}
            label={attachmentsCount > 0 ? `ATTACHMENTS (${attachmentsCount})` : "ATTACHMENTS"}
          />
        </div>

        {tab === "summary" && (
          <div className="p-lg grid grid-cols-12 gap-lg flex-1">
            <div className="col-span-12 lg:col-span-8 grid grid-cols-2 gap-md">
              <div className="col-span-2 bg-white border border-outline-variant p-md rounded-lg shadow-sm">
                <h3 className="font-label-caps text-secondary mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">info</span>
                  CASE OVERVIEW
                </h3>
                <p className="font-body-md text-on-surface leading-relaxed mb-4">
                  {caseRow.description?.trim() ? caseRow.description : "No description provided for this case."}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-lg border-t border-surface-variant pt-4">
                  <div>
                    <span className="text-label-caps text-secondary block mb-1">PRIORITY</span>
                    <span className={`font-system-id font-bold flex items-center gap-1 ${pr?.textClass ?? ""}`}>
                      <span className="material-symbols-outlined text-xs">priority_high</span>
                      {caseRow.priority.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-label-caps text-secondary block mb-1">CASE TYPE</span>
                    <span className="font-system-id text-on-surface">{caseRow.type}</span>
                  </div>
                  <div>
                    <span className="text-label-caps text-secondary block mb-1">DUE</span>
                    <span className="font-system-id text-on-surface">
                      {caseRow.dueDate ? formatCaseUpdated(caseRow.dueDate) : "—"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-outline-variant p-md rounded-lg shadow-sm">
                <h3 className="font-label-caps text-secondary mb-3">ASSIGNEE</h3>
                {caseRow.assignee ? (
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-sm shrink-0">
                      {`${caseRow.assignee.firstName ?? ""} ${caseRow.assignee.lastName ?? ""}`.trim().slice(0, 2).toUpperCase() || "?"}
                    </div>
                    <div>
                      <p className="font-body-sm font-bold text-on-surface">
                        {`${caseRow.assignee.firstName ?? ""} ${caseRow.assignee.lastName ?? ""}`.trim() || "Assigned user"}
                      </p>
                      <p className="text-xs text-secondary font-mono">{caseRow.assignee.email ?? caseRow.assignedTo}</p>
                    </div>
                  </div>
                ) : (
                  <p className="font-body-sm text-secondary">No primary assignee on this case.</p>
                )}
              </div>
              <div className="bg-white border border-outline-variant p-md rounded-lg shadow-sm">
                <h3 className="font-label-caps text-secondary mb-3">CREATOR</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm shrink-0">
                    {(creatorName || caseRow.createdBy || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-body-sm font-bold text-on-surface">{creatorName || "Unknown"}</p>
                    <p className="text-xs text-secondary font-mono">{caseRow.createdBy}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-outline-variant p-md rounded-lg shadow-sm">
                <h3 className="font-label-caps text-secondary mb-3">TENANT</h3>
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
                  WORKFLOW
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                    bolt
                  </span>
                </h3>
                
                {caseState?.currentStep ? (
                  <div className="mb-6">
                    <p className="text-xs text-slate-500 font-label-caps mb-1">CURRENT STEP</p>
                    <p className="text-lg font-bold text-slate-800 flex items-center gap-2">
                      {caseState.currentStep.name}
                      {caseState.currentStep.isFinal && <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full uppercase">Terminal</span>}
                    </p>
                  </div>
                ) : (
                  <p className="text-sm opacity-90 mb-6 text-slate-500">Workflow engine not started or case is legacy.</p>
                )}

                {caseState?.availableActions && caseState.availableActions.length > 0 && (
                  <div>
                    <p className="text-xs text-slate-500 font-label-caps mb-3">AVAILABLE ACTIONS</p>
                    <div className="flex flex-col gap-2">
                      {caseState.availableActions.map(action => (
                        <button
                          key={action.id}
                          onClick={() => handleAction(action.id, action.requiresComment)}
                          className="bg-primary text-white w-full py-2.5 rounded text-sm font-semibold hover:bg-teal-700 transition-colors flex justify-center items-center gap-2 shadow-sm"
                        >
                          {action.name}
                          <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
                {caseState?.availableActions?.length === 0 && caseState?.currentStep && !caseState.currentStep.isFinal && (
                   <div className="bg-slate-50 p-3 rounded border border-slate-200 text-slate-500 text-xs">
                     No actions available for your role at this step.
                   </div>
                )}
              </div>
              <div className="bg-white border border-outline-variant p-md rounded-lg shadow-sm">
                <h3 className="font-label-caps text-secondary mb-4">ATTACHMENTS</h3>
                {attachmentsCount === 0 ? (
                  <p className="text-body-sm text-secondary">No attachments on this case.</p>
                ) : (
                  <ul className="space-y-3">
                    {attachmentsList.map((att) => (
                      <li key={att.id}>
                        <span className="text-body-sm font-medium">{att.originalFilename ?? att.filename}</span>
                        <span className="text-xs text-secondary block">{formatBytes(att.fileSize)}</span>
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
                  Case Timeline
               </h3>
               {caseState?.history && caseState.history.length > 0 ? (
                 <div className="space-y-6 relative before:absolute before:left-[15px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-200">
                    {caseState.history.map(item => (
                      <div key={item.id} className="relative pl-10">
                        <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-white border-2 border-primary flex items-center justify-center z-10">
                          <span className="material-symbols-outlined text-[16px] text-primary">swap_calls</span>
                        </div>
                        <div className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm">
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-slate-800">{item.transition ? item.transition.name : 'System Action'}</span>
                            <span className="text-xs text-slate-400">{formatCaseUpdated(item.transitionedAt)}</span>
                          </div>
                          {item.comment && (
                            <p className="text-sm text-slate-600 bg-slate-50 p-2 rounded mb-2 italic">"{item.comment}"</p>
                          )}
                          <p className="text-xs text-slate-400">
                            By: {item.actor ? `${item.actor.firstName} ${item.actor.lastName}` : 'Unknown'}
                          </p>
                        </div>
                      </div>
                    ))}
                 </div>
               ) : (
                 <p className="text-slate-500">No history available for this case.</p>
               )}
             </div>
           </div>
        )}

        {tab === "referrals" && (!user?.tenant?.id || !user.id) && (
          <div className="p-xl text-center text-secondary font-body-md">
            <p>Sign in with a tenant to create referrals for this case.</p>
          </div>
        )}
        {tab === "referrals" && user?.tenant?.id && user.id && (
          <CaseReferralsPanel caseId={caseRow.id} fromTenantId={user.tenant.id} userId={user.id} />
        )}

        {tab === "assignment" && (
          <div className="p-lg flex-1 max-w-3xl mx-auto w-full space-y-lg">
            <h3 className="font-h3 text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-primary">person_search</span>
              Case assignments
            </h3>
            <p className="text-sm text-secondary">
              Active assignments for this case. Assigning updates the case&apos;s primary assignee and creates an audit
              entry.
            </p>
            <div className="bg-white border border-outline-variant rounded-lg p-md shadow-sm space-y-md">
              <p className="font-label-caps text-secondary text-xs">Assign to user</p>
              <div className="flex flex-col sm:flex-row gap-3 flex-wrap">
                <select
                  className="flex-1 min-w-[200px] rounded-lg border border-outline-variant px-md py-sm text-body-sm"
                  value={assignUserId}
                  onChange={(e) => setAssignUserId(e.target.value)}
                >
                  <option value="">Select user…</option>
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
                  placeholder="Type (optional)"
                  value={assignType}
                  onChange={(e) => setAssignType(e.target.value)}
                />
              </div>
              <textarea
                className="w-full rounded-lg border border-outline-variant px-md py-sm text-body-sm min-h-[72px]"
                placeholder="Notes (optional)"
                value={assignNotes}
                onChange={(e) => setAssignNotes(e.target.value)}
              />
              <button
                type="button"
                disabled={assignBusy || !assignUserId}
                onClick={() => void submitAssignment()}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
              >
                {assignBusy ? "Assigning…" : "Assign case"}
              </button>
            </div>
            <div className="space-y-3">
              {assignmentsList.length === 0 ? (
                <p className="text-secondary text-sm">No active assignment records.</p>
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
                        <p className="text-xs text-secondary mt-1">Type: {a.assignmentType}</p>
                      )}
                      {a.notes && <p className="text-sm text-slate-600 mt-2 italic">&quot;{a.notes}&quot;</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => void unassign(a.id)}
                      className="text-sm font-semibold text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 shrink-0"
                    >
                      Unassign
                    </button>
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
              Attachments
            </h3>
            <p className="text-sm text-secondary">
              Registers file metadata with the case service (binary upload pipeline can replace the stub path later).
            </p>
            <div className="bg-white border border-outline-variant rounded-lg p-md shadow-sm space-y-md">
              <input
                type="file"
                onChange={(e) => setAttachmentFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-600"
              />
              <textarea
                className="w-full rounded-lg border border-outline-variant px-md py-sm text-body-sm min-h-[64px]"
                placeholder="Description (optional)"
                value={attachmentDesc}
                onChange={(e) => setAttachmentDesc(e.target.value)}
              />
              <button
                type="button"
                disabled={attachmentBusy || !attachmentFile}
                onClick={() => void submitAttachment()}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-teal-700 disabled:opacity-50"
              >
                {attachmentBusy ? "Saving…" : "Register attachment"}
              </button>
            </div>
            <ul className="divide-y divide-outline-variant border border-outline-variant rounded-lg overflow-hidden bg-white shadow-sm">
              {attachmentsList.length === 0 ? (
                <li className="p-md text-secondary text-sm">No attachments yet.</li>
              ) : (
                attachmentsList.map((att) => (
                  <li key={att.id} className="p-md flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-on-surface">{att.originalFilename ?? att.filename}</p>
                      <p className="text-xs text-secondary">
                        {formatBytes(att.fileSize)} · {att.mimeType}
                        {att.uploader
                          ? ` · ${`${att.uploader.firstName ?? ""} ${att.uploader.lastName ?? ""}`.trim() || "Uploader"}`
                          : ""}
                      </p>
                      {att.description && <p className="text-sm text-slate-600 mt-1">{att.description}</p>}
                    </div>
                    <button
                      type="button"
                      onClick={() => void removeAttachment(att.id)}
                      className="text-sm font-semibold text-red-700 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 shrink-0 self-start sm:self-center"
                    >
                      Remove
                    </button>
                  </li>
                ))
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
