/** Formal transition letter template (tenant header/footer + standard body). */

import DOMPurify from "dompurify";

const LETTER_BODY_ALLOWED_TAGS = [
  "p",
  "br",
  "strong",
  "em",
  "b",
  "i",
  "u",
  "ul",
  "ol",
  "li",
  "h1",
  "h2",
  "h3",
  "blockquote",
];

export type LetterTemplateConfig = {
  letterHeader?: string;
  letterFooter?: string;
  letterAddress?: string;
  letterClosing?: string;
  logoUrl?: string;
  primaryColor?: string;
};

export type TransitionLetterInput = {
  subject: string;
  salutation: string;
  body: string;
  closing?: string;
  signatoryName: string;
  signatoryTitle?: string;
};

export type TransitionLetterContext = {
  caseNumber: string;
  caseTitle: string;
  transitionName: string;
  targetStepName?: string;
  organizationName: string;
  organizationCode?: string;
  dateIso?: string;
};

export function defaultLetterInput(ctx: TransitionLetterContext): TransitionLetterInput {
  const step = ctx.targetStepName ? ` — advancing to “${ctx.targetStepName}”` : "";
  return {
    subject: `Case ${ctx.caseNumber}: ${ctx.transitionName}${step}`,
    salutation: "To Whom It May Concern:",
    body: `This letter documents the workflow action “${ctx.transitionName}” on case ${ctx.caseNumber} (${ctx.caseTitle}).`,
    closing: undefined,
    signatoryName: "",
    signatoryTitle: "",
  };
}

export function buildLetterPlainText(
  template: LetterTemplateConfig,
  ctx: TransitionLetterContext,
  input: TransitionLetterInput,
): string {
  const date = formatLetterDate(ctx.dateIso ?? new Date().toISOString());
  const closing = (input.closing?.trim() || template.letterClosing?.trim() || "Respectfully,").trim();
  const header = template.letterHeader?.trim() || ctx.organizationName;
  const footer = template.letterFooter?.trim() || "";
  const address = template.letterAddress?.trim() || "";

  const lines: string[] = [];
  lines.push(header);
  if (address) lines.push(address);
  lines.push("");
  lines.push(date);
  lines.push(`Re: Case ${ctx.caseNumber} — ${ctx.caseTitle}`);
  lines.push(`Action: ${ctx.transitionName}${ctx.targetStepName ? ` → ${ctx.targetStepName}` : ""}`);
  lines.push(`Subject: ${input.subject.trim()}`);
  lines.push("");
  lines.push(htmlToPlainText(input.salutation).trim());
  lines.push("");
  lines.push(letterBodyPlainText(input.body));
  lines.push("");
  lines.push(htmlToPlainText(closing).trim());
  if (input.signatoryName.trim()) {
    lines.push(input.signatoryName.trim());
    if (input.signatoryTitle?.trim()) lines.push(input.signatoryTitle.trim());
  }
  lines.push(ctx.organizationName);
  if (footer) {
    lines.push("");
    lines.push("—".repeat(40));
    lines.push(footer);
  }
  return lines.join("\n");
}

export function buildLetterHtml(
  template: LetterTemplateConfig,
  ctx: TransitionLetterContext,
  input: TransitionLetterInput,
  logoUrl?: string,
): string {
  const plain = buildLetterPlainText(template, ctx, input);
  const primary = template.primaryColor || "#0f766e";
  const headerBlock = (template.letterHeader?.trim() || ctx.organizationName)
    .split("\n")
    .map((l) => `<div class="org-line">${escapeHtml(l)}</div>`)
    .join("");
  const addressBlock = (template.letterAddress?.trim() || "")
    .split("\n")
    .filter(Boolean)
    .map((l) => `<div class="muted">${escapeHtml(l)}</div>`)
    .join("");
  const footerBlock = (template.letterFooter?.trim() || "")
    .split("\n")
    .filter(Boolean)
    .map((l) => `<div class="footer-line">${escapeHtml(l)}</div>`)
    .join("");
  const closing = (input.closing?.trim() || template.letterClosing?.trim() || "Respectfully,").trim();
  const date = formatLetterDate(ctx.dateIso ?? new Date().toISOString());

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<title>Letter — ${escapeHtml(ctx.caseNumber)}</title>
<style>
  @page { margin: 2cm; }
  body { font-family: Georgia, "Times New Roman", serif; font-size: 12pt; color: #1e293b; line-height: 1.55; max-width: 700px; margin: 0 auto; }
  .letterhead { border-bottom: 3px solid ${primary}; padding-bottom: 12px; margin-bottom: 20px; display: flex; gap: 16px; align-items: flex-start; }
  .logo { max-height: 56px; max-width: 160px; object-fit: contain; }
  .org-line { font-weight: 700; font-size: 13pt; color: ${primary}; }
  .muted { font-size: 10pt; color: #64748b; margin-top: 4px; }
  .meta { font-size: 10pt; color: #475569; margin-bottom: 20px; }
  .meta div { margin: 2px 0; }
  .salutation { margin: 16px 0 12px; }
  .salutation p { margin: 0; }
  .body { margin: 0 0 24px; text-align: justify; }
  .body p { margin: 0 0 12px; }
  .body ul, .body ol { margin: 0 0 12px 1.5em; }
  .closing { margin-top: 24px; }
  .sig { margin-top: 8px; font-weight: 600; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #cbd5e1; font-size: 9pt; color: #64748b; }
  .footer-line { margin: 2px 0; }
</style>
</head>
<body>
  <header class="letterhead">
    ${logoUrl ? `<img class="logo" src="${escapeHtml(logoUrl)}" alt=""/>` : ""}
    <div>
      ${headerBlock}
      ${addressBlock}
    </div>
  </header>
  <div class="meta">
    <div><strong>Date:</strong> ${escapeHtml(date)}</div>
    <div><strong>Re:</strong> Case ${escapeHtml(ctx.caseNumber)} — ${escapeHtml(ctx.caseTitle)}</div>
    <div><strong>Action:</strong> ${escapeHtml(ctx.transitionName)}${ctx.targetStepName ? ` → ${escapeHtml(ctx.targetStepName)}` : ""}</div>
    <div><strong>Subject:</strong> ${escapeHtml(input.subject.trim())}</div>
  </div>
  <div class="salutation">${sanitizeLetterHtml(input.salutation.trim())}</div>
  <div class="body">${sanitizeLetterHtml(input.body.trim())}</div>
  <div class="closing">
    <div>${sanitizeLetterHtml(closing)}</div>
    ${input.signatoryName.trim() ? `<p class="sig">${escapeHtml(input.signatoryName.trim())}${input.signatoryTitle?.trim() ? `<br/><span style="font-weight:normal;font-size:10pt">${escapeHtml(input.signatoryTitle.trim())}</span>` : ""}</p>` : ""}
    <p class="sig">${escapeHtml(ctx.organizationName)}</p>
  </div>
  ${footerBlock ? `<footer class="footer">${footerBlock}</footer>` : ""}
  <!-- plain-text fallback:${escapeHtml(plain.slice(0, 80))}… -->
</body>
</html>`;
}

export function letterFilename(caseNumber: string, transitionName: string): string {
  const safe = `${caseNumber}-${transitionName}`.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 80);
  return `transition-letter-${safe}-${Date.now()}.html`;
}

/** Opens the system print dialog (choose “Save as PDF” for a PDF file). Uses a hidden iframe so pop-up blockers do not apply. */
export function printLetterHtml(html: string): void {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("title", "Transition letter print");
  iframe.style.cssText =
    "position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none";
  document.body.appendChild(iframe);

  const win = iframe.contentWindow;
  const doc = win?.document;
  if (!doc || !win) {
    document.body.removeChild(iframe);
    throw new Error("Could not prepare the letter for printing.");
  }

  doc.open();
  doc.write(html);
  doc.close();

  const cleanup = () => {
    window.setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 500);
  };

  window.setTimeout(() => {
    try {
      win.focus();
      win.print();
    } finally {
      cleanup();
    }
  }, 300);
}

export function downloadLetterHtml(html: string, filename: string): void {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function formatLetterDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

export function letterBodyPlainText(body: string): string {
  return htmlToPlainText(body).trim();
}

export function toEditorHtml(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "";
  if (/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;
  return trimmed
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph.replace(/\n/g, " "))}</p>`)
    .join("");
}

export function htmlToPlainText(html: string): string {
  const trimmed = html.trim();
  if (!trimmed) return "";
  if (!/<[a-z][\s\S]*>/i.test(trimmed)) return trimmed;
  const doc = new DOMParser().parseFromString(trimmed, "text/html");
  return (doc.body.textContent ?? "").replace(/\u00a0/g, " ");
}

export function sanitizeLetterHtml(html: string): string {
  return DOMPurify.sanitize(html, { ALLOWED_TAGS: LETTER_BODY_ALLOWED_TAGS });
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
