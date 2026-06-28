/** Dashboard API types (case-service /dashboard). */

export type DashboardTask = {
  id: string;
  type: "referral_pending" | "transition" | "transition_overdue" | "attachment_required";
  priority: string;
  title: string;
  description: string;
  caseId: string;
  caseNumber: string | null;
  caseTitle: string | null;
  referralId: string | null;
  partnerCode: string | null;
  partnerName: string | null;
  transitionId?: string;
  dueAt: string | null;
  isPastDue: boolean;
  blocked?: boolean;
  actionLabel: string;
  href: string;
};

export type DashboardTasksResponse = {
  tasks?: DashboardTask[];
  summary?: {
    total: number;
    referrals: number;
    transitions: number;
    attachments: number;
  };
};

export type DashboardReportsResponse = {
  generatedAt?: string;
  cases?: {
    total: number;
    open: number;
    closed: number;
    inCustody: number;
    byPriority: Record<string, number>;
    byStatus: Record<string, number>;
  };
  referrals?: {
    total: number;
    incoming: number;
    outgoing: number;
    pendingIncoming: number;
    byStatus: Record<string, number>;
  };
  workflows?: {
    total: number;
    byStatus: Record<string, number>;
  };
  activity?: {
    transitionsLast30Days: number;
    recent: Array<{
      id: string;
      caseId: string;
      caseNumber: string | null;
      caseTitle: string | null;
      transitionName: string | null;
      actorLabel: string | null;
      transitionedAt: string;
    }>;
  };
  partners?: Array<{
    code: string;
    name: string;
    incoming: number;
    outgoing: number;
    pending: number;
  }>;
};

import i18n from "@/i18n";

export function taskTypeLabel(type: DashboardTask["type"]): string {
  return i18n.t(`tasks.type.${type}`, { defaultValue: type });
}

export function taskStripeClass(task: DashboardTask): string {
  if (task.type === "referral_pending") return "bg-teal-600";
  if (task.type === "attachment_required") return "bg-amber-500";
  if (task.isPastDue || task.type === "transition_overdue") return "bg-error";
  if (task.priority === "urgent" || task.priority === "high") return "bg-amber-400";
  return "bg-slate-300";
}
