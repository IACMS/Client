/** Full case dossier report — HTML generation and PDF export via browser print. */

import type { ApiCase } from "@/lib/casesApi";
import { formatCaseUpdated } from "@/lib/casesApi";
import type { ApiReferral } from "@/lib/referralsApi";
import type { WorkflowGuideStep } from "@/components/CaseWorkflowGuidePanel";
import {
  downloadLetterHtml,
  printLetterHtml,
  type LetterTemplateConfig,
} from "@/lib/transitionLetter";

export type CaseReportHistoryRow = {
  id: string;
  transition?: { name?: string } | null;
  actor?: { firstName?: string; lastName?: string } | null;
  comment?: string | null;
  transitionedAt: string;
  fromStep?: { name: string } | null;
  toStep?: { name: string } | null;
};

export type CaseReportAssignment = {
  id: string;
  assignmentType?: string;
  notes?: string | null;
  assignee?: { firstName?: string; lastName?: string; email?: string };
};

export type CaseReportAttachment = {
  id: string;
  originalFilename?: string;
  filename: string;
  mimeType: string;
  fileSize: number;
  description?: string | null;
  workflowStepId?: string | null;
  uploader?: { firstName?: string; lastName?: string };
};

export type CaseReportInput = {
  case: ApiCase;
  currentStep?: {
    id: string;
    name: string;
    key: string;
    isFinal?: boolean;
    requiresAttachment?: boolean;
  } | null;
  workflowGuide?: {
    steps: WorkflowGuideStep[];
    transitions: { id: string; name: string; fromStepId: string; toStepId: string }[];
  } | null;
  history: CaseReportHistoryRow[];
  assignments: CaseReportAssignment[];
  attachments: CaseReportAttachment[];
  referrals: ApiReferral[];
  stepNameById: Map<string, string>;
  generatedBy?: string;
  organizationName: string;
  template?: LetterTemplateConfig;
  logoUrl?: string;
};

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "—";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function formatReportDate(iso?: string): string {
  try {
    return new Date(iso ?? new Date().toISOString()).toLocaleString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso ?? "";
  }
}

function personName(p?: { firstName?: string; lastName?: string } | null): string {
  if (!p) return "—";
  const n = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
  return n || "—";
}

function phaseLabel(phase: WorkflowGuideStep["phase"]): string {
  if (phase === "completed") return "Completed";
  if (phase === "current") return "Current";
  return "Upcoming";
}

function section(title: string, body: string): string {
  return `<section class="report-section">
    <h2 class="section-title">${escapeHtml(title)}</h2>
    ${body}
  </section>`;
}

function kvTable(rows: [string, string][]): string {
  if (rows.length === 0) return `<p class="muted">No data.</p>`;
  const trs = rows
    .map(
      ([k, v]) =>
        `<tr><th scope="row">${escapeHtml(k)}</th><td>${v}</td></tr>`,
    )
    .join("");
  return `<table class="kv-table"><tbody>${trs}</tbody></table>`;
}

export function caseReportFilename(caseNumber: string): string {
  const safe = caseNumber.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 60);
  return `case-report-${safe}-${Date.now()}.html`;
}

export function buildCaseReportHtml(input: CaseReportInput): string {
  const { case: c } = input;
  const primary = input.template?.primaryColor || "#0f766e";
  const headerText = (input.template?.letterHeader?.trim() || input.organizationName)
    .split("\n")
    .map((l) => `<div class="org-line">${escapeHtml(l)}</div>`)
    .join("");
  const addressBlock = (input.template?.letterAddress?.trim() || "")
    .split("\n")
    .filter(Boolean)
    .map((l) => `<div class="muted">${escapeHtml(l)}</div>`)
    .join("");
  const footerBlock = (input.template?.letterFooter?.trim() || "")
    .split("\n")
    .filter(Boolean)
    .map((l) => `<div class="footer-line">${escapeHtml(l)}</div>`)
    .join("");

  const creatorName = personName(c.creator);
  const assigneeName = personName(c.assignee);

  const overviewRows: [string, string][] = [
    ["Case number", `<span class="mono">${escapeHtml(c.caseNumber)}</span>`],
    ["Title", escapeHtml(c.title)],
    ["Status", `<span class="badge">${escapeHtml(c.status.toUpperCase())}</span>`],
    ["Priority", escapeHtml((c.priority ?? "normal").toUpperCase())],
    ["Type", escapeHtml(c.type ?? "—")],
    ["Description", escapeHtml(c.description?.trim() || "No description provided.")],
    ["Created", escapeHtml(c.createdAt ? formatCaseUpdated(c.createdAt) : "—")],
    ["Last updated", escapeHtml(formatCaseUpdated(c.updatedAt))],
    ["Due date", escapeHtml(c.dueDate ? formatCaseUpdated(c.dueDate) : "—")],
    ["Referral status", escapeHtml(c.referralStatus?.replace(/_/g, " ") ?? "None")],
  ];

  const partiesRows: [string, string][] = [
    ["Agency", escapeHtml(c.tenant?.name ?? "—")],
    ["Agency code", `<span class="mono">${escapeHtml(c.tenant?.code ?? c.tenantId ?? "—")}</span>`],
    ["Creator", escapeHtml(creatorName)],
    ["Primary assignee", escapeHtml(assigneeName)],
    [
      "Assignee email",
      `<span class="mono">${escapeHtml(c.assignee?.email ?? c.assignedTo ?? "—")}</span>`,
    ],
  ];

  const workflowRows: [string, string][] = [
    ["Workflow", escapeHtml(c.workflow?.name ?? "—")],
    [
      "Workflow key",
      `<span class="mono">${escapeHtml(c.workflow?.key ?? "—")}</span>`,
    ],
    [
      "Pinned version",
      `<span class="mono">v${escapeHtml(String(c.workflowVersion ?? c.workflow?.version ?? "—"))}</span>`,
    ],
    ["Workflow status", escapeHtml(c.workflow?.status ?? "—")],
    [
      "Current step",
      escapeHtml(input.currentStep?.name ?? c.currentStep?.name ?? "—"),
    ],
    [
      "Step key",
      `<span class="mono">${escapeHtml(input.currentStep?.key ?? c.currentStep?.key ?? "—")}</span>`,
    ],
  ];
  if (input.currentStep?.isFinal) {
    workflowRows.push(["Step type", "Terminal (final)"]);
  }
  if (input.currentStep?.requiresAttachment) {
    workflowRows.push(["Attachment requirement", "At least one file required on this step"]);
  }

  const guideSteps = input.workflowGuide?.steps ?? [];
  const guideHtml =
    guideSteps.length === 0
      ? `<p class="muted">No workflow guide available.</p>`
      : `<ol class="step-list">${guideSteps
          .map(
            (s) =>
              `<li class="step-item step-${s.phase}">
                <span class="step-phase">${escapeHtml(phaseLabel(s.phase))}</span>
                <strong>${escapeHtml(s.name)}</strong>
                <span class="mono muted">(${escapeHtml(s.key)})</span>
                ${s.requiresAttachment ? `<span class="tag">Needs file</span>` : ""}
              </li>`,
          )
          .join("")}</ol>`;

  const historyHtml =
    input.history.length === 0
      ? `<p class="muted">No activity recorded.</p>`
      : `<table class="data-table">
          <thead><tr>
            <th>Date</th><th>Action</th><th>From → To</th><th>Actor</th><th>Comment</th>
          </tr></thead>
          <tbody>${input.history
            .map((h) => {
              const action = h.transition?.name ?? "Case opened";
              const route =
                h.fromStep || h.toStep
                  ? `${h.fromStep?.name ?? "Start"} → ${h.toStep?.name ?? "—"}`
                  : "—";
              const comment = h.comment?.trim()
                ? escapeHtml(h.comment)
                : `<span class="muted">—</span>`;
              return `<tr>
                <td class="nowrap">${escapeHtml(formatCaseUpdated(h.transitionedAt))}</td>
                <td>${escapeHtml(action)}</td>
                <td>${escapeHtml(route)}</td>
                <td>${escapeHtml(personName(h.actor))}</td>
                <td class="comment">${comment}</td>
              </tr>`;
            })
            .join("")}</tbody>
        </table>`;

  const assignmentsHtml =
    input.assignments.length === 0
      ? `<p class="muted">No active assignments.</p>`
      : `<table class="data-table">
          <thead><tr><th>Assignee</th><th>Email</th><th>Type</th><th>Notes</th></tr></thead>
          <tbody>${input.assignments
            .map((a) => {
              const notes = a.notes?.trim()
                ? escapeHtml(a.notes)
                : `<span class="muted">—</span>`;
              return `<tr>
                <td>${escapeHtml(personName(a.assignee))}</td>
                <td class="mono">${escapeHtml(a.assignee?.email ?? "—")}</td>
                <td>${escapeHtml(a.assignmentType ?? "—")}</td>
                <td class="comment">${notes}</td>
              </tr>`;
            })
            .join("")}</tbody>
        </table>`;

  const attachmentsHtml =
    input.attachments.length === 0
      ? `<p class="muted">No attachments on this case.</p>`
      : `<table class="data-table">
          <thead><tr><th>File</th><th>Size</th><th>Type</th><th>Workflow step</th><th>Description</th></tr></thead>
          <tbody>${input.attachments
            .map((a) => {
              const stepLabel = a.workflowStepId
                ? input.stepNameById.get(a.workflowStepId) ?? a.workflowStepId.slice(0, 8) + "…"
                : "—";
              const desc = a.description?.trim()
                ? escapeHtml(a.description)
                : `<span class="muted">—</span>`;
              return `<tr>
                <td>${escapeHtml(a.originalFilename ?? a.filename)}</td>
                <td>${escapeHtml(formatBytes(a.fileSize))}</td>
                <td class="mono">${escapeHtml(a.mimeType)}</td>
                <td>${escapeHtml(stepLabel)}</td>
                <td>${desc}</td>
              </tr>`;
            })
            .join("")}</tbody>
        </table>`;

  const referralsHtml =
    input.referrals.length === 0
      ? `<p class="muted">No inter-agency referrals.</p>`
      : `<table class="data-table">
          <thead><tr><th>Direction</th><th>Status</th><th>Reason</th><th>Referred</th></tr></thead>
          <tbody>${input.referrals
            .map((r) => {
              const from = r.fromTenant?.code ?? r.fromTenant?.name ?? "—";
              const to = r.toTenant?.code ?? r.toTenant?.name ?? "—";
              const reason = r.referralReason?.trim()
                ? escapeHtml(r.referralReason)
                : `<span class="muted">—</span>`;
              return `<tr>
                <td>${escapeHtml(from)} → ${escapeHtml(to)}</td>
                <td><span class="badge">${escapeHtml(r.status.toUpperCase())}</span></td>
                <td>${reason}</td>
                <td class="nowrap">${escapeHtml(r.referredAt ? formatCaseUpdated(r.referredAt) : "—")}</td>
              </tr>`;
            })
            .join("")}</tbody>
        </table>`;

  const generatedAt = formatReportDate();
  const generatedBy = input.generatedBy?.trim() || "System user";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Case Report — ${escapeHtml(c.caseNumber)}</title>
<style>
  @page { margin: 1.5cm; size: A4; }
  * { box-sizing: border-box; }
  body {
    font-family: "Segoe UI", system-ui, -apple-system, sans-serif;
    font-size: 10pt;
    color: #1e293b;
    line-height: 1.45;
    margin: 0;
    padding: 0;
  }
  .letterhead {
    border-bottom: 3px solid ${primary};
    padding-bottom: 12px;
    margin-bottom: 20px;
    display: flex;
    gap: 16px;
    align-items: flex-start;
  }
  .logo { max-height: 52px; max-width: 140px; object-fit: contain; }
  .org-line { font-weight: 700; font-size: 13pt; color: ${primary}; }
  .muted { color: #64748b; font-size: 9pt; }
  .report-title {
    font-size: 18pt;
    font-weight: 700;
    color: #0f172a;
    margin: 0 0 4px;
  }
  .report-subtitle {
    font-size: 11pt;
    color: #475569;
    margin: 0 0 16px;
  }
  .meta-bar {
    display: flex;
    flex-wrap: wrap;
    gap: 12px 24px;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 10px 14px;
    margin-bottom: 20px;
    font-size: 9pt;
  }
  .meta-bar div { margin: 0; }
  .report-section { margin-bottom: 22px; page-break-inside: avoid; }
  .section-title {
    font-size: 11pt;
    font-weight: 700;
    color: ${primary};
    text-transform: uppercase;
    letter-spacing: 0.04em;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 4px;
    margin: 0 0 10px;
  }
  .kv-table { width: 100%; border-collapse: collapse; }
  .kv-table th {
    text-align: left;
    vertical-align: top;
    width: 28%;
    padding: 5px 10px 5px 0;
    font-weight: 600;
    color: #475569;
    font-size: 9pt;
  }
  .kv-table td { padding: 5px 0; vertical-align: top; }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
  }
  .data-table th {
    text-align: left;
    background: #f1f5f9;
    padding: 6px 8px;
    border: 1px solid #e2e8f0;
    font-weight: 600;
    color: #334155;
  }
  .data-table td {
    padding: 6px 8px;
    border: 1px solid #e2e8f0;
    vertical-align: top;
  }
  .data-table tr:nth-child(even) td { background: #fafafa; }
  .step-list { margin: 0; padding-left: 20px; }
  .step-item { margin-bottom: 6px; }
  .step-phase {
    display: inline-block;
    font-size: 8pt;
    font-weight: 700;
    text-transform: uppercase;
    padding: 1px 6px;
    border-radius: 4px;
    margin-right: 6px;
    background: #e2e8f0;
    color: #475569;
  }
  .step-current .step-phase { background: ${primary}22; color: ${primary}; }
  .step-completed .step-phase { background: #d1fae5; color: #065f46; }
  .tag {
    font-size: 8pt;
    background: #ccfbf1;
    color: #115e59;
    padding: 1px 5px;
    border-radius: 3px;
    margin-left: 4px;
  }
  .badge {
    display: inline-block;
    font-size: 8pt;
    font-weight: 700;
    padding: 2px 6px;
    border-radius: 4px;
    background: #e0f2fe;
    color: #0369a1;
  }
  .mono { font-family: ui-monospace, monospace; font-size: 9pt; }
  .nowrap { white-space: nowrap; }
  .comment { font-style: italic; color: #475569; max-width: 200px; }
  .footer {
    margin-top: 28px;
    padding-top: 10px;
    border-top: 1px solid #cbd5e1;
    font-size: 8pt;
    color: #64748b;
  }
  .footer-line { margin: 2px 0; }
  .confidential {
    margin-top: 8px;
    font-size: 8pt;
    color: #94a3b8;
    font-style: italic;
  }
</style>
</head>
<body>
  <header class="letterhead">
    ${input.logoUrl ? `<img class="logo" src="${escapeHtml(input.logoUrl)}" alt=""/>` : ""}
    <div>
      ${headerText}
      ${addressBlock}
    </div>
  </header>

  <h1 class="report-title">Case Report</h1>
  <p class="report-subtitle">${escapeHtml(c.caseNumber)} — ${escapeHtml(c.title)}</p>

  <div class="meta-bar">
    <div><strong>Generated:</strong> ${escapeHtml(generatedAt)}</div>
    <div><strong>Prepared by:</strong> ${escapeHtml(generatedBy)}</div>
    <div><strong>Agency:</strong> ${escapeHtml(input.organizationName)}</div>
  </div>

  ${section("Case overview", kvTable(overviewRows))}
  ${section("Parties & custody", kvTable(partiesRows))}
  ${section("Workflow", kvTable(workflowRows) + guideHtml)}
  ${section("Activity log", historyHtml)}
  ${section("Assignments", assignmentsHtml)}
  ${section("Attachments", attachmentsHtml)}
  ${section("Inter-agency referrals", referralsHtml)}

  <footer class="footer">
    ${footerBlock}
    <p class="confidential">This report was generated from the Inter-Agency Case Management System and may contain sensitive information. Handle in accordance with your agency&apos;s data protection policies.</p>
  </footer>
</body>
</html>`;
}

export function exportCaseReportPdf(html: string): void {
  printLetterHtml(html);
}

export function downloadCaseReportHtml(html: string, caseNumber: string): void {
  downloadLetterHtml(html, caseReportFilename(caseNumber));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
