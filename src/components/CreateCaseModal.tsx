import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, apiGet, apiPost } from "@/lib/api";

type WorkflowRow = { id: string; name: string; key?: string; version?: number; status?: string; isActive?: boolean };

type Props = {
  open: boolean;
  onClose: () => void;
  tenantId: string;
  userId: string;
  /** If set, called after create instead of navigating away (e.g. refresh list on Cases page). */
  onCreated?: (caseId: string) => void;
};

export default function CreateCaseModal({ open, onClose, tenantId, userId: _userId, onCreated }: Props) {
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("internal");
  const [priority, setPriority] = useState("normal");
  const [workflowId, setWorkflowId] = useState("");
  const [workflows, setWorkflows] = useState<WorkflowRow[]>([]);
  const [loadingWf, setLoadingWf] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    let cancelled = false;
    (async () => {
      setLoadingWf(true);
      try {
        const q = new URLSearchParams({ tenantId, status: "PUBLISHED" });
        const data = (await apiGet(`/api/v1/workflows?${q}`)) as { workflows?: WorkflowRow[] };
        if (!cancelled)
          setWorkflows(
            Array.isArray(data.workflows) ? data.workflows.filter((w) => w.isActive !== false) : [],
          );
      } catch {
        if (!cancelled) setWorkflows([]);
      } finally {
        if (!cancelled) setLoadingWf(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, tenantId]);

  useEffect(() => {
    if (!open) {
      setTitle("");
      setDescription("");
      setType("internal");
      setPriority("normal");
      setWorkflowId("");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) {
      setError("Title is required.");
      return;
    }
    const wf = workflowId.trim();
    if (!wf) {
      setError("Select a published workflow. Cases are created on a workflow with an initial step.");
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const body: Record<string, string> = {
        workflowId: wf,
        title: t,
        type: type.trim() || "internal",
        priority: priority.trim() || "normal",
      };
      if (description.trim()) body.description = description.trim();

      const raw = (await apiPost("/api/v1/cases", body)) as { case?: { id?: string } };
      const id = raw.case?.id;
      if (!id) throw new Error("Invalid response: missing case id");

      onClose();
      if (onCreated) onCreated(id);
      else navigate(`/cases/${encodeURIComponent(id)}`);
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.status === 403
            ? "You don’t have permission to create cases (RBAC: cases:create)."
            : err.message
          : err instanceof Error
            ? err.message
            : "Could not create case.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
      role="presentation"
      onClick={onClose}
      onKeyDown={(e) => e.key === "Escape" && onClose()}
    >
      <div
        role="dialog"
        onClick={(e) => e.stopPropagation()}
        aria-modal="true"
        aria-labelledby="create-case-title"
        className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[90dvh] overflow-y-auto border border-slate-200"
      >
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 id="create-case-title" className="font-h3 text-primary">
            Create case
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 text-slate-600"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="text-sm text-red-800 bg-red-50 border border-red-200 rounded-lg p-3">{error}</div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="cc-title">
              Title
            </label>
            <input
              id="cc-title"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="cc-desc">
              Description
            </label>
            <textarea
              id="cc-desc"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[80px]"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="cc-type">
                Type
              </label>
              <input
                id="cc-type"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder="e.g. internal"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="cc-pri">
                Priority
              </label>
              <select
                id="cc-pri"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">low</option>
                <option value="normal">normal</option>
                <option value="high">high</option>
                <option value="urgent">urgent</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="cc-wf">
              Workflow <span className="text-red-600">*</span>
            </label>
            <select
              id="cc-wf"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={workflowId}
              onChange={(e) => setWorkflowId(e.target.value)}
              disabled={loadingWf}
              required
            >
              <option value="">{loadingWf ? "Loading…" : "Select a published workflow…"}</option>
              {workflows.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                  {typeof w.version === "number" ? ` (v${w.version})` : ""}
                  {w.key ? ` — ${w.key}` : ""}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">Only published workflows are listed. The case pins this workflow version.</p>
            {!loadingWf && workflows.length === 0 && (
              <p className="text-[11px] text-amber-700 mt-1">No published workflows for this tenant. Publish one under Workflows first.</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !workflowId.trim() || workflows.length === 0}
              className="px-4 py-2 text-sm font-semibold bg-primary-container text-white rounded-lg disabled:opacity-50"
            >
              {submitting ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
