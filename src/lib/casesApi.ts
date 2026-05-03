/** Case list/detail shapes returned by IACMS case-service via gateway. */

export type ApiCaseTenant = {
  id?: string;
  name?: string;
  code?: string;
};

export type ApiCaseAttachment = {
  id?: string;
  fileName?: string;
};

export type ApiCaseCreator = {
  id?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
};

export type ApiCase = {
  id: string;
  tenantId?: string;
  caseNumber: string;
  title: string;
  description?: string | null;
  status: string;
  priority: string;
  type?: string;
  updatedAt: string;
  createdAt?: string;
  dueDate?: string | null;
  createdBy?: string;
  workflowId?: string | null;
  tenant?: ApiCaseTenant | null;
  creator?: ApiCaseCreator | null;
  attachments?: ApiCaseAttachment[];
};

export function statusBadgeClass(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("escalat")) return "bg-red-50 text-red-700 border-red-200";
  if (s.includes("resolved") || s.includes("closed")) return "bg-green-50 text-green-700 border-green-200";
  if (s.includes("pending")) return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-blue-50 text-blue-700 border-blue-200";
}

export function priorityDisplay(priority: string): { label: string; dot: string; textClass: string } {
  const p = priority.toLowerCase();
  if (p === "critical" || p === "urgent") {
    return { label: priority.toUpperCase(), dot: "bg-error", textClass: "text-error" };
  }
  if (p === "high") {
    return { label: priority.toUpperCase(), dot: "bg-amber-400", textClass: "text-amber-700" };
  }
  return { label: priority.toUpperCase(), dot: "bg-slate-400", textClass: "text-slate-700" };
}

export function formatCaseUpdated(iso: string): string {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}
