export type TenantMini = { id?: string; name?: string; code?: string };

export type ReferralProgress = {
  range?: string;
  lastUpdatedAt?: string | null;
};

export type ApiReferral = {
  id: string;
  caseId: string;
  status: string;
  fromTenantId?: string;
  toTenantId?: string;
  fromDepartmentId?: string | null;
  toDepartmentId?: string | null;
  referralReason?: string | null;
  notes?: string | null;
  fromTenant?: TenantMini;
  toTenant?: TenantMini;
  fromDepartment?: { id?: string; code?: string; name?: string } | null;
  toDepartment?: { id?: string; code?: string; name?: string } | null;
  referredAt?: string;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  completedAt?: string | null;
  case?: {
    caseNumber?: string;
    title?: string;
    referralStatus?: string | null;
    currentStepId?: string | null;
    assignedTo?: string | null;
    status?: string;
    updatedAt?: string;
  };
  progress?: ReferralProgress;
};

export function referralProgressClass(range?: string): string {
  const value = String(range || "").toLowerCase();
  if (value === "completed") return "bg-emerald-100 text-emerald-800";
  if (value === "rejected") return "bg-red-100 text-red-800";
  if (value === "near completion") return "bg-blue-100 text-blue-800";
  if (value === "being worked on") return "bg-teal-100 text-teal-800";
  if (value === "assigned") return "bg-violet-100 text-violet-800";
  return "bg-amber-100 text-amber-800";
}

export async function assignReferralWorkflow(
  apiPost: (path: string, body?: unknown) => Promise<unknown>,
  referralId: string,
  payload: { workflowId: string; assignedToUserId: string },
) {
  return apiPost(
    `/api/v1/referrals/${encodeURIComponent(referralId)}/assign`,
    payload,
  );
}

export function referralStatusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "completed" || s === "accepted")
    return "bg-emerald-100 text-emerald-800";
  if (s === "rejected" || s === "cancelled") return "bg-red-100 text-red-800";
  if (s === "pending") return "bg-amber-100 text-amber-800";
  return "bg-slate-100 text-slate-700";
}

export function referralDirection(
  referral: ApiReferral,
  actorTenantId: string,
): "incoming" | "outgoing" | "other" {
  const to = referral.toTenantId ?? referral.toTenant?.id;
  const from = referral.fromTenantId ?? referral.fromTenant?.id;
  if (to === actorTenantId) return "incoming";
  if (from === actorTenantId) return "outgoing";
  return "other";
}
