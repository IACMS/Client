import { FormEvent, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import LetterRichTextEditor from "@/components/LetterRichTextEditor";
import { getApiBase } from "@/lib/api";
import {
  buildLetterHtml,
  buildLetterPlainText,
  defaultLetterInput,
  downloadLetterHtml,
  letterBodyPlainText,
  letterFilename,
  printLetterHtml,
  type LetterTemplateConfig,
  type TransitionLetterContext,
  type TransitionLetterInput,
} from "@/lib/transitionLetter";

export type TransitionLetterResult = {
  plainText: string;
  html: string;
  attachToCase: boolean;
  filename: string;
};

type TenantLike = {
  name?: string;
  code?: string;
  config?: LetterTemplateConfig & Record<string, unknown>;
};

type Props = {
  open: boolean;
  onClose: () => void;
  actionName: string;
  targetStepName?: string;
  requiresLetter: boolean;
  caseNumber: string;
  caseTitle: string;
  tenant?: TenantLike | null;
  signatoryName: string;
  signatoryTitle?: string;
  submitting: boolean;
  error: string | null;
  onExecute: (result: TransitionLetterResult) => void;
};

function LetterPreviewOverlay({
  html,
  exportMsg,
  onClose,
  onPrint,
  onDownload,
}: {
  html: string;
  exportMsg: string | null;
  onClose: () => void;
  onPrint: () => void;
  onDownload: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div
      className="absolute inset-0 z-10 flex flex-col bg-white rounded-xl overflow-hidden"
      role="dialog"
      aria-label={t("modals.workflow.letterPreview")}
    >
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
        <div>
          <h3 className="font-h3 text-primary">{t("modals.workflow.letterPreview")}</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Final layout including agency header and footer
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
            onClick={onPrint}
          >
            <span className="material-symbols-outlined text-[16px]">print</span>
            Print / Save as PDF
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
            onClick={onDownload}
          >
            <span className="material-symbols-outlined text-[16px]">download</span>
            Download HTML
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50"
          >
            <span className="material-symbols-outlined text-[16px]">edit</span>
            Back to editor
          </button>
        </div>
      </div>
      {exportMsg && (
        <p className="text-xs text-teal-800 px-4 py-2 bg-teal-50 border-b border-teal-100 shrink-0" role="status">
          {exportMsg}
        </p>
      )}
      <div className="flex-1 min-h-0 p-4 bg-slate-100 overflow-hidden flex justify-center">
        <iframe
          title={t("modals.workflow.letterPreview")}
          srcDoc={html}
          className="w-full h-full bg-white rounded-lg shadow-md border border-slate-200"
        />
      </div>
    </div>
  );
}

export default function TransitionLetterModal({
  open,
  onClose,
  actionName,
  targetStepName,
  requiresLetter,
  caseNumber,
  caseTitle,
  tenant,
  signatoryName,
  signatoryTitle,
  submitting,
  error,
  onExecute,
}: Props) {
  const { t } = useTranslation();
  const ctx: TransitionLetterContext = useMemo(
    () => ({
      caseNumber,
      caseTitle,
      transitionName: actionName,
      targetStepName,
      organizationName: tenant?.name ?? t("modals.workflow.organizationFallback"),
      organizationCode: tenant?.code,
    }),
    [caseNumber, caseTitle, actionName, targetStepName, tenant, t],
  );

  const template: LetterTemplateConfig = useMemo(
    () => ({
      ...(tenant?.config ?? {}),
      logoUrl: tenant?.config?.logoUrl,
      primaryColor: tenant?.config?.primaryColor,
    }),
    [tenant],
  );

  const [input, setInput] = useState<TransitionLetterInput>(() =>
    defaultLetterInput(ctx),
  );
  const [attachToCase, setAttachToCase] = useState(true);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [editorSeed, setEditorSeed] = useState(0);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!open) return;
    const base = defaultLetterInput(ctx);
    setInput({
      ...base,
      signatoryName: signatoryName || base.signatoryName,
      signatoryTitle: signatoryTitle || base.signatoryTitle,
    });
    setAttachToCase(true);
    setExportMsg(null);
    setShowPreview(false);
    setEditorSeed((s) => s + 1);
  }, [open, actionName, signatoryName, signatoryTitle, ctx]);

  const logoUrl = useMemo(() => {
    const raw = template.logoUrl;
    if (!raw) return undefined;
    if (raw.startsWith("http")) return raw;
    return `${getApiBase()}${raw}`;
  }, [template.logoUrl]);

  const htmlPreview = useMemo(
    () => buildLetterHtml(template, ctx, input, logoUrl),
    [template, ctx, input, logoUrl],
  );

  if (!open) return null;

  const bodyOk = letterBodyPlainText(input.body).length >= 20;
  const canSubmit = !requiresLetter || bodyOk;

  function buildResult(): TransitionLetterResult {
    const plainText = buildLetterPlainText(template, ctx, input);
    const html = buildLetterHtml(template, ctx, input, logoUrl);
    return {
      plainText,
      html,
      attachToCase,
      filename: letterFilename(caseNumber, actionName),
    };
  }

  function handleExportPrint() {
    setExportMsg(null);
    try {
      printLetterHtml(htmlPreview);
      setExportMsg(t("modals.workflow.printPdfHint"));
    } catch (e) {
      setExportMsg(e instanceof Error ? e.message : t("modals.workflow.printFailed"));
    }
  }

  function handleExportDownload() {
    setExportMsg(null);
    try {
      downloadLetterHtml(htmlPreview, letterFilename(caseNumber, actionName));
      setExportMsg(t("modals.workflow.htmlDownloaded"));
    } catch (e) {
      setExportMsg(e instanceof Error ? e.message : t("modals.workflow.downloadFailed"));
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    onExecute(buildResult());
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
      role="presentation"
      onClick={() => !submitting && onClose()}
    >
      <div
        role="dialog"
        aria-labelledby="letter-tr-title"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
        className="relative bg-white rounded-xl shadow-lg w-full max-w-5xl h-[min(88vh,820px)] border border-slate-200 flex flex-col overflow-hidden"
      >
        {showPreview && (
          <LetterPreviewOverlay
            html={htmlPreview}
            exportMsg={exportMsg}
            onClose={() => setShowPreview(false)}
            onPrint={handleExportPrint}
            onDownload={handleExportDownload}
          />
        )}

        <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <h2 id="letter-tr-title" className="font-h3 text-primary truncate">
              Formal transition letter
            </h2>
            <p className="text-sm text-slate-600 mt-0.5 truncate">
              <span className="font-semibold">{actionName}</span>
              {targetStepName ? (
                <>
                  {" "}
                  → <span className="text-teal-800 font-semibold">{targetStepName}</span>
                </>
              ) : null}
              <span className="text-slate-400 mx-2">·</span>
              <span className="font-mono text-xs">{caseNumber}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={submitting}
              onClick={() => setShowPreview(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-slate-200 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[18px]">visibility</span>
              Preview
            </button>
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
              aria-label={t("common.close")}
            >
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        </header>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
            {error && (
              <div className="mx-4 mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
                {error}
              </div>
            )}

            <div className="px-4 pt-3 pb-2 space-y-2 border-b border-slate-100 bg-slate-50/80">
              <p className="text-[11px] text-slate-500">
                Header and footer from{" "}
                <span className="font-semibold">Settings → Portal customization</span>.{" "}
                <span className="font-semibold">Preview</span> shows the finished letter.
              </p>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1" htmlFor="ltr-subj">
                  Subject line
                </label>
                <input
                  id="ltr-subj"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                  value={input.subject}
                  onChange={(e) => setInput((p) => ({ ...p, subject: e.target.value }))}
                  disabled={submitting}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1" htmlFor="ltr-sal">
                  Salutation
                </label>
                <LetterRichTextEditor
                  key={`sal-${editorSeed}`}
                  id="ltr-sal"
                  value={input.salutation}
                  onChange={(html) => setInput((p) => ({ ...p, salutation: html }))}
                  placeholder={t("modals.workflow.letterToPlaceholder")}
                  disabled={submitting}
                  minHeight="48px"
                />
              </div>
            </div>

            <div className="px-4 py-3 space-y-1">
              <label className="block text-[11px] font-semibold text-slate-600" htmlFor="ltr-body">
                Letter body {requiresLetter && <span className="text-red-600">*</span>}
              </label>
              <LetterRichTextEditor
                key={editorSeed}
                id="ltr-body"
                value={input.body}
                onChange={(html) => setInput((p) => ({ ...p, body: html }))}
                placeholder={t("modals.workflow.letterBodyPlaceholder")}
                disabled={submitting}
                minHeight="200px"
              />
              {requiresLetter && !bodyOk && (
                <p className="text-xs text-amber-800">At least a short paragraph is required.</p>
              )}
            </div>

            <div className="px-4 pb-3 pt-1 space-y-2 border-t border-slate-100 bg-slate-50/80">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1" htmlFor="ltr-close">
                  Closing
                </label>
                <LetterRichTextEditor
                  key={`close-${editorSeed}`}
                  id="ltr-close"
                  value={input.closing ?? ""}
                  onChange={(html) => setInput((p) => ({ ...p, closing: html }))}
                  placeholder={template.letterClosing ?? t("modals.workflow.letterClosingPlaceholder")}
                  disabled={submitting}
                  minHeight="48px"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1" htmlFor="ltr-sign">
                    Signatory
                  </label>
                  <input
                    id="ltr-sign"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                    value={input.signatoryName}
                    onChange={(e) => setInput((p) => ({ ...p, signatoryName: e.target.value }))}
                    disabled={submitting}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1" htmlFor="ltr-sign-title">
                    Signatory title
                  </label>
                  <input
                    id="ltr-sign-title"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                    value={input.signatoryTitle ?? ""}
                    onChange={(e) => setInput((p) => ({ ...p, signatoryTitle: e.target.value }))}
                    disabled={submitting}
                    placeholder={t("common.optional")}
                  />
                </div>
              </div>
            </div>
          </div>

          <footer className="shrink-0 border-t border-slate-200 bg-white px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3 shadow-[0_-4px_12px_-2px_rgba(0,0,0,0.06)]">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer sm:mr-auto">
              <input
                type="checkbox"
                checked={attachToCase}
                onChange={(e) => setAttachToCase(e.target.checked)}
                disabled={submitting}
                className="rounded border-slate-300"
              />
              Attach letter to case file
            </label>
            <div className="flex gap-2 sm:ml-auto">
              <button
                type="button"
                disabled={submitting}
                onClick={onClose}
                className="flex-1 sm:flex-none px-5 py-2.5 rounded-lg border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
              >
                {t("common.cancel")}
              </button>
              <button
                type="submit"
                disabled={submitting || !canSubmit}
                className="flex-1 sm:flex-none bg-primary text-white px-5 py-2.5 rounded-lg font-semibold hover:bg-primary-container disabled:opacity-50"
              >
                {submitting ? t("modals.workflow.executing") : t("modals.workflow.executeWithLetter")}
              </button>
            </div>
          </footer>
        </form>
      </div>
    </div>
  );
}
