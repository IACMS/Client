export type TenantMini = { id?: string; name?: string; code?: string };

export type ApiReferral = {
  id: string;
  caseId: string;
  status: string;
  fromTenantId?: string;
  toTenantId?: string;
  referralReason?: string | null;
  notes?: string | null;
  fromTenant?: TenantMini;
  toTenant?: TenantMini;
  referredAt?: string;
  acceptedAt?: string | null;
  rejectedAt?: string | null;
  completedAt?: string | null;
  case?: { caseNumber?: string; title?: string };
};

export function referralStatusClass(status: string): string {
  const s = status.toLowerCase();
  if (s === "completed" || s === "accepted") return "bg-emerald-100 text-emerald-800";
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
