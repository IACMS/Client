import { FormEvent, useState } from "react";
import { ApiError, apiPost } from "@/lib/api";

export type CreatedWorkflow = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
  version: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  userId?: string;
  onCreated?: (workflow: CreatedWorkflow) => void;
};

function slugifyKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function CreateWorkflowModal({ open, onClose, userId, onCreated }: Props) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyManual, setKeyManual] = useState(false);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function reset() {
    setName("");
    setKey("");
    setKeyManual(false);
    setDescription("");
    setErrorMessage(null);
    setSubmitting(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  if (!open) return null;

  function onNameChange(v: string) {
    setName(v);
    if (!keyManual) setKey(slugifyKey(v));
  }

  function onKeyChange(v: string) {
    setKeyManual(true);
    setKey(v.toLowerCase().replace(/[^a-z0-9-]/g, ""));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const k = key.trim();
    if (!n || !k) {
      setErrorMessage("Name and workflow key are required.");
      return;
    }
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const body: Record<string, string> = { name: n, key: k };
      const d = description.trim();
      if (d) body.description = d;
      if (userId) body.createdBy = userId;

      const res = (await apiPost("/api/v1/workflows", body)) as { workflow?: CreatedWorkflow };
      const wf = res.workflow;
      if (!wf?.id) {
        setErrorMessage("Unexpected response from server.");
        return;
      }
      onCreated?.(wf);
      handleClose();
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Could not create workflow.";
      setErrorMessage(
        message.includes("fetch") || message === "Failed to fetch"
          ? "Cannot reach the API gateway. Check VITE_API_URL and services."
          : message,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
      role="presentation"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-labelledby="create-wf-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-lg max-w-md w-full border border-slate-200 flex flex-col max-h-[min(90dvh,640px)]"
      >
        <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h2 id="create-wf-title" className="font-h3 text-primary flex items-center gap-2">
            <span className="material-symbols-outlined" aria-hidden>
              account_tree
            </span>
            Create workflow
          </h2>
          <button type="button" onClick={handleClose} className="p-1 rounded hover:bg-slate-100" aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 overflow-y-auto flex flex-col gap-3">
          <p className="text-xs text-slate-600">
            Creates a new <span className="font-semibold">DRAFT</span> workflow for your tenant. You can add steps and
            transitions in the designer, then publish.
          </p>
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{errorMessage}</div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="wf-name">
              Display name
            </label>
            <input
              id="wf-name"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Standard intake review"
              autoComplete="off"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="wf-key">
              Workflow key
            </label>
            <input
              id="wf-key"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
              value={key}
              onChange={(e) => onKeyChange(e.target.value)}
              placeholder="e.g. standard-intake-review"
              autoComplete="off"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Lowercase letters, numbers, and hyphens. Filled automatically from the name until you edit it.
            </p>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="wf-desc">
              Description <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <textarea
              id="wf-desc"
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm resize-y min-h-[72px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What this workflow is used for…"
            />
          </div>
          <div className="flex gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || !key.trim()}
              className="flex-1 bg-primary text-white py-2.5 rounded-lg font-semibold hover:bg-primary-container disabled:opacity-50 disabled:pointer-events-none"
            >
              {submitting ? "Creating…" : "Create draft"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
