import { useState } from "react";
import LetterRichTextEditor from "./LetterRichTextEditor";
import {
  FMS_CASE_SERVICE,
  FMS_MODULE_ATTACHMENT,
  fmsFilePath,
  uploadAndWaitAvailable,
} from "@/lib/filesApi";
import { apiPost, ApiError } from "@/lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  caseId: string;
  workflowStepId?: string | null;
  onSaved: () => void;
};

export default function WriteRichAttachmentModal({
  open,
  onClose,
  caseId,
  workflowStepId,
  onSaved,
}: Props) {
  const [title, setTitle] = useState("");
  const [contentHtml, setContentHtml] = useState("<p>Write observation notes, assessment details, or official documentation here...</p>");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSaveDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    const docTitle = title.trim();
    if (!docTitle) {
      setError("Please provide a document title.");
      return;
    }
    if (!contentHtml.trim()) {
      setError("Document content cannot be empty.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${docTitle}</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; line-height: 1.6; color: #1e293b; padding: 2rem; max-width: 800px; margin: 0 auto; }
    h1 { color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 0.5rem; }
  </style>
</head>
<body>
  <h1>${docTitle}</h1>
  <div>${contentHtml}</div>
</body>
</html>`;

      const safeFilename = `${docTitle.toLowerCase().replace(/[^a-z0-9]+/g, "_")}.html`;
      const blob = new Blob([fullHtml], { type: "text/html;charset=utf-8" });

      const fmsFile = await uploadAndWaitAvailable({
        file: blob,
        filename: safeFilename,
        service: FMS_CASE_SERVICE,
        module: FMS_MODULE_ATTACHMENT,
        referenceId: caseId,
      });

      await apiPost("/api/v1/attachments", {
        caseId,
        filename: safeFilename,
        originalFilename: `${docTitle}.html`,
        mimeType: "text/html",
        fileSize: fmsFile.size,
        filePath: fmsFilePath(fmsFile.id),
        description: `Written document note: ${docTitle}`,
        ...(workflowStepId ? { workflowStepId } : {}),
      });

      setTitle("");
      setContentHtml("");
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save written document attachment.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40">
      <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center pb-3 border-b border-slate-100 shrink-0">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <span className="material-symbols-outlined text-teal-600">edit_note</span>
            Write Rich Text Note / Document (CKEditor)
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSaveDocument} className="flex-1 flex flex-col min-h-0 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm shrink-0">
              {error}
            </div>
          )}

          <div className="shrink-0">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Document Title *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Field Assessment Note, Case Summary Memo..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            />
          </div>

          <div className="flex-1 min-h-[300px] flex flex-col">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Document Body (CKEditor Rich Text)
            </label>
            <LetterRichTextEditor
              value={contentHtml}
              onChange={(html) => setContentHtml(html)}
              placeholder="Type your notes here..."
              minHeight="250px"
              className="flex-1"
            />
          </div>

          <div className="flex gap-3 pt-3 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !title.trim()}
              className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-base">task_alt</span>
              {saving ? "Saving Attachment..." : "Save Document Attachment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
