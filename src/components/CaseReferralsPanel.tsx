import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import ReferralActions from "@/components/ReferralActions";
import {
  assignReferralWorkflow,
  type ApiReferral,
  referralDirection,
  referralProgressClass,
  referralStatusClass,
} from "@/lib/referralsApi";

export type { ApiReferral };

type WorkflowOption = { id: string; name: string; key: string; version: number; status?: string };
type TenantUserOption = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
};

function formatWhen(value?: string | null) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function ReferralsList({
  caseId,
  version,
  actorTenantId,
  userId,
  onRefresh,
}: {
  caseId: string;
  version: number;
  actorTenantId: string;
  userId: string;
  onRefresh: () => void;
}) {
  const { t } = useTranslation();
  const [rows, setRows] = useState<ApiReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const q = new URLSearchParams({ caseId });
        const data = (await apiGet(`/api/v1/referrals?${q}`)) as { referrals?: ApiReferral[] };
        if (!cancelled) setRows(Array.isArray(data.referrals) ? data.referrals : []);
      } catch (e) {
        if (!cancelled)
          setErr(e instanceof ApiError ? e.message : t("modals.referral.loadFailed"));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId, version]);

  if (loading) {
    return (
      <p className="text-sm text-slate-500 flex items-center gap-2">
        <span className="material-symbols-outlined text-lg animate-pulse">progress_activity</span>
        {t("common.loading")}
      </p>
    );
  }
  if (err) {
    return <p className="text-sm text-red-700">{err}</p>;
  }
  if (rows.length === 0) {
    return <p className="text-sm text-slate-600">{t("modals.referral.noReferrals")}</p>;
  }
  return (
    <ul className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden bg-white">
      {rows.map((r) => {
        const direction = referralDirection(r, actorTenantId);
        return (
          <li key={r.id} className="p-4 text-sm">
            <div className="flex flex-wrap justify-between gap-2 items-start">
              <span className="font-semibold text-slate-800">
                {r.fromTenant?.code ?? "—"} → {r.toTenant?.code ?? "—"}
              </span>
              <span
                className={`text-xs uppercase font-bold px-2 py-0.5 rounded ${referralStatusClass(r.status)}`}
              >
                {r.status}
              </span>
            </div>
            {r.referralReason && <p className="text-slate-600 mt-2">{r.referralReason}</p>}
            {direction === "outgoing" && r.progress && (
              <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[11px] font-semibold uppercase text-slate-500">Progress</span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded ${referralProgressClass(r.progress.range)}`}
                  >
                    {r.progress.range ?? "Received"}
                  </span>
                </div>
                <div className="grid gap-1 text-xs text-slate-600">
                  <p>Referred: {formatWhen(r.referredAt)}</p>
                  <p>Accepted: {formatWhen(r.acceptedAt)}</p>
                  <p>Completed: {formatWhen(r.completedAt)}</p>
                  <p>Last updated: {formatWhen(r.progress.lastUpdatedAt)}</p>
                </div>
              </div>
            )}
            <div className="mt-3">
              <ReferralActions
                referral={r}
                actorTenantId={actorTenantId}
                userId={userId}
                layout="stack"
                onUpdated={onRefresh}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default function CaseReferralsPanel({
  caseId,
  fromTenantId,
  userId,
  canCreate = true,
  onRefresh,
}: {
  caseId: string;
  fromTenantId: string;
  userId: string;
  /** When false, hide the "create referral" form and only render the read-only list. */
  canCreate?: boolean;
  onRefresh?: () => void;
}) {
  const { t } = useTranslation();
  const [partnerCode, setPartnerCode] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [listVersion, setListVersion] = useState(0);
  const [rows, setRows] = useState<ApiReferral[]>([]);
  const [workflowOptions, setWorkflowOptions] = useState<WorkflowOption[]>([]);
  const [tenantUsers, setTenantUsers] = useState<TenantUserOption[]>([]);
  const [workflowId, setWorkflowId] = useState("");
  const [assignedToUserId, setAssignedToUserId] = useState("");
  const [assignBusy, setAssignBusy] = useState(false);
  const [assignMsg, setAssignMsg] = useState<string | null>(null);

  const pendingInboundAssignment = useMemo(
    () =>
      rows.find(
        (r) =>
          referralDirection(r, fromTenantId) === "incoming" &&
          r.status === "accepted" &&
          r.case?.referralStatus?.toLowerCase() === "awaiting_assignment",
      ) ?? null,
    [rows, fromTenantId],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const q = new URLSearchParams({ caseId });
        const data = (await apiGet(`/api/v1/referrals?${q}`)) as { referrals?: ApiReferral[] };
        if (!cancelled) setRows(Array.isArray(data.referrals) ? data.referrals : []);
      } catch {
        if (!cancelled) setRows([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId, listVersion]);

  useEffect(() => {
    if (!pendingInboundAssignment) return;
    let cancelled = false;
    (async () => {
      try {
        const [workflowPayload, usersPayload] = await Promise.all([
          apiGet("/api/v1/workflows?status=PUBLISHED"),
          apiGet("/api/v1/auth/users"),
        ]);
        if (cancelled) return;
        const workflows =
          (workflowPayload as { workflows?: WorkflowOption[] }).workflows?.filter(
            (workflow) => workflow.key !== "referral-intake",
          ) ?? [];
        const users = (usersPayload as { users?: TenantUserOption[] }).users ?? [];
        setWorkflowOptions(workflows);
        setTenantUsers(users.filter((user) => user.isActive));
      } catch {
        if (!cancelled) {
          setWorkflowOptions([]);
          setTenantUsers([]);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pendingInboundAssignment]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const code = partnerCode.trim().toUpperCase();
    if (!code) {
      setMsg(t("modals.referral.partnerRequired"));
      return;
    }
    setMsg(null);
    setSubmitting(true);
    try {
      const v = (await apiGet(`/api/v1/tenants/validate/${encodeURIComponent(code)}`)) as {
        valid?: boolean;
        tenant?: { id: string };
      };
      const toTenantId = v.tenant?.id;
      if (!v.valid || !toTenantId) {
        setMsg(t("modals.referral.unknownTenant"));
        setSubmitting(false);
        return;
      }
      if (toTenantId === fromTenantId) {
        setMsg(t("modals.referral.partnerMustDiffer"));
        setSubmitting(false);
        return;
      }
      await apiPost("/api/v1/referrals", {
        caseId,
        fromTenantId,
        toTenantId,
        referredBy: userId,
        ...(reason.trim() ? { referralReason: reason.trim() } : {}),
      });
      setPartnerCode("");
      setReason("");
      setListVersion((x) => x + 1);
      setMsg(t("modals.referral.created"));
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : t("modals.referral.createFailed"));
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReceiverAssignment(e: FormEvent) {
    e.preventDefault();
    if (!pendingInboundAssignment) return;
    if (!workflowId || !assignedToUserId) {
      setAssignMsg("Select both a workflow and a case taker.");
      return;
    }
    setAssignMsg(null);
    setAssignBusy(true);
    try {
      await assignReferralWorkflow(apiPost, pendingInboundAssignment.id, {
        workflowId,
        assignedToUserId,
      });
      setWorkflowId("");
      setAssignedToUserId("");
      setAssignMsg("Referral assigned successfully.");
      setListVersion((x) => x + 1);
      onRefresh?.();
    } catch (err) {
      setAssignMsg(err instanceof ApiError ? err.message : "Could not assign referral workflow.");
    } finally {
      setAssignBusy(false);
    }
  }

  return (
    <div className="p-lg space-y-lg max-w-3xl">
      <div>
        <h3 className="font-h3 text-primary mb-2">
          {canCreate ? "Refer this case to a partner tenant" : "Referrals for this case"}
        </h3>
        <p className="text-sm text-slate-600">
          {canCreate
            ? "Enter the partner organization's tenant code. They receive a record via the referral service (and email when notifications are configured)."
            : "Your role can view referrals on this case but not create new ones."}
        </p>
      </div>
      {canCreate && (
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        {msg && (
          <p
            className={`text-sm ${msg.includes("created") && !msg.includes("not") ? "text-teal-800" : "text-red-700"}`}
          >
            {msg}
          </p>
        )}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="ref-code">
            {t("modals.referral.partnerCode")}
          </label>
          <input
            id="ref-code"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono uppercase"
            value={partnerCode}
            onChange={(e) => setPartnerCode(e.target.value)}
            placeholder="e.g. PARTNER-ORG"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="ref-reason">
            {t("common.description")} ({t("common.optional")})
          </label>
          <textarea
            id="ref-reason"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[72px]"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary-container text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {submitting ? t("modals.referral.submitting") : t("modals.referral.newReferral")}
        </button>
      </form>
      )}
      {pendingInboundAssignment && (
        <form
          onSubmit={handleReceiverAssignment}
          className="bg-white border border-teal-200 rounded-xl p-4 space-y-3"
        >
          <div>
            <h4 className="font-semibold text-teal-900">Assign local workflow and case taker</h4>
            <p className="text-sm text-slate-600 mt-1">
              This referral has been accepted. Choose the receiving agency workflow and assignee before work begins.
            </p>
          </div>
          {assignMsg && (
            <p className={`text-sm ${assignMsg.includes("successfully") ? "text-teal-800" : "text-red-700"}`}>
              {assignMsg}
            </p>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Workflow</label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={workflowId}
              onChange={(e) => setWorkflowId(e.target.value)}
            >
              <option value="">Select workflow</option>
              {workflowOptions.map((workflow) => (
                <option key={workflow.id} value={workflow.id}>
                  {workflow.name} ({workflow.key}) v{workflow.version}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Case taker</label>
            <select
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={assignedToUserId}
              onChange={(e) => setAssignedToUserId(e.target.value)}
            >
              <option value="">Select assignee</option>
              {tenantUsers.map((user) => (
                <option key={user.id} value={user.id}>
                  {`${user.firstName} ${user.lastName}`.trim()} ({user.email})
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={assignBusy}
            className="bg-primary-container text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {assignBusy ? "Assigning…" : "Assign workflow and case taker"}
          </button>
        </form>
      )}
      <div>
        <h4 className="font-label-caps text-slate-500 mb-2">Existing referrals</h4>
        <ReferralsList
          caseId={caseId}
          version={listVersion}
          actorTenantId={fromTenantId}
          userId={userId}
          onRefresh={() => setListVersion((x) => x + 1)}
        />
      </div>
    </div>
  );
}
