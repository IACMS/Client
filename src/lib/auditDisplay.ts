import { formatAuditWhen } from "@/lib/auditApi";

export type AuditChangeRow = {
  field: string;
  label: string;
  previous: string;
  next: string;
  changed: boolean;
};

const ACTION_LABELS: Record<string, string> = {
  "case.create": "Case created",
  "case.update": "Case updated",
  "case.delete": "Case deleted",
  "case.transition": "Workflow transition",
  "referral.create": "Referral created",
  "referral.accept": "Referral accepted",
  "referral.reject": "Referral rejected",
  "referral.complete": "Referral completed",
  "workflow.create": "Workflow created",
  "workflow.update": "Workflow updated",
  "workflow.delete": "Workflow deleted",
  "workflow.publish": "Workflow published",
  "workflow.archive": "Workflow archived",
  "tenant.update": "Tenant settings updated",
  "tenant.logo": "Tenant logo updated",
  "user.create": "User created",
  "user.update": "User updated",
  "user.delete": "User deleted",
};

const FIELD_LABELS: Record<string, string> = {
  caseNumber: "Case number",
  caseId: "Case ID",
  currentStepId: "Workflow step",
  stepKey: "Step key",
  transitionId: "Transition ID",
  transitionName: "Transition",
  workflowId: "Workflow ID",
  workflowKey: "Workflow",
  workflowVersion: "Workflow version",
  title: "Title",
  description: "Description",
  priority: "Priority",
  status: "Status",
  type: "Type",
  softDeleted: "Soft deleted",
  deleted: "Deleted",
  dataPresent: "Custom data present",
  toTenantId: "Destination agency",
  fromTenantId: "Source agency",
  caseCurrentTenantId: "Case custody agency",
  caseReferralStatus: "Referral status",
  caseReturnedToTenantId: "Returned to agency",
  logoUrl: "Logo URL",
  email: "Email",
  firstName: "First name",
  lastName: "Last name",
  isActive: "Active",
  roleIds: "Roles",
  version: "Version",
  key: "Key",
  name: "Name",
};

const ISO_DATE_RE =
  /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$/;

export function formatAuditAction(action: string): string {
  const trimmed = action.trim();
  if (!trimmed) return "Unknown action";
  if (ACTION_LABELS[trimmed]) return ACTION_LABELS[trimmed];
  return trimmed
    .split(/[._]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

export function humanizeFieldLabel(field: string): string {
  if (FIELD_LABELS[field]) return FIELD_LABELS[field];
  const leaf = field.includes(".") ? field.split(".").pop()! : field;
  if (FIELD_LABELS[leaf]) return FIELD_LABELS[leaf];
  return leaf
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatEntityType(entityType?: string | null): string {
  if (!entityType?.trim()) return "—";
  return humanizeFieldLabel(entityType);
}

function isIsoDateString(value: string): boolean {
  return ISO_DATE_RE.test(value) && !Number.isNaN(Date.parse(value));
}

function isEmptyValue(value: unknown): boolean {
  if (value == null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === "object") return Object.keys(value as object).length === 0;
  return false;
}

function flattenRecord(value: unknown, prefix = ""): [string, unknown][] {
  if (isEmptyValue(value)) return [];
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return prefix ? [[prefix, value]] : [["value", value]];
  }
  const entries: [string, unknown][] = [];
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v != null && typeof v === "object" && !Array.isArray(v)) {
      entries.push(...flattenRecord(v, key));
    } else {
      entries.push([key, v]);
    }
  }
  return entries;
}

export function formatDisplayValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") return String(value);
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "—";
    if (isIsoDateString(trimmed)) return formatAuditWhen(trimmed);
    return trimmed;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return "—";
    return value.map((v) => formatDisplayValue(v)).join(", ");
  }
  const parts = Object.entries(value as Record<string, unknown>).map(
    ([k, v]) => `${humanizeFieldLabel(k)}: ${formatDisplayValue(v)}`,
  );
  return parts.length > 0 ? parts.join(" · ") : "—";
}

export function buildAuditChangeRows(
  oldValues: unknown,
  newValues: unknown,
): AuditChangeRow[] {
  const oldFlat = Object.fromEntries(flattenRecord(oldValues));
  const newFlat = Object.fromEntries(flattenRecord(newValues));
  const keys = new Set([...Object.keys(oldFlat), ...Object.keys(newFlat)]);
  if (keys.size === 0) return [];

  return [...keys]
    .sort((a, b) => a.localeCompare(b))
    .map((field) => {
      const previous = formatDisplayValue(oldFlat[field]);
      const next = formatDisplayValue(newFlat[field]);
      return {
        field,
        label: humanizeFieldLabel(field),
        previous,
        next,
        changed: previous !== next,
      };
    });
}

export function buildAuditDetailRows(value: unknown): { label: string; value: string }[] {
  const flat = flattenRecord(value);
  if (flat.length === 0) return [];
  return flat.map(([field, v]) => ({
    label: humanizeFieldLabel(field),
    value: formatDisplayValue(v),
  }));
}

export function hasAuditPayload(value: unknown): boolean {
  return buildAuditDetailRows(value).length > 0;
}
