import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState("internal");
  const [priority, setPriority] = useState("normal");
  const [workflowKey, setWorkflowKey] = useState("");
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
      setWorkflowKey("");
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setError(t("cases.createModal.titleRequired"));
      return;
    }
    const wfKey = workflowKey.trim();
    if (!wfKey) {
      setError(t("cases.createModal.workflowRequired"));
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const body: Record<string, string> = {
        workflowKey: wfKey,
        title: trimmedTitle,
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
            ? t("cases.createModal.noPermission")
            : err.message
          : err instanceof Error
            ? err.message
            : t("cases.createModal.failed");
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
            {t("cases.createModal.title")}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100 text-slate-600"
            aria-label={t("common.close")}
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
              {t("cases.createModal.field.title")}
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
              {t("cases.createModal.field.description")}
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
                {t("cases.createModal.field.type")}
              </label>
              <input
                id="cc-type"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={type}
                onChange={(e) => setType(e.target.value)}
                placeholder={t("cases.createModal.field.typePlaceholder")}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="cc-pri">
                {t("cases.createModal.field.priority")}
              </label>
              <select
                id="cc-pri"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              >
                <option value="low">{t("cases.createModal.priority.low")}</option>
                <option value="normal">{t("cases.createModal.priority.normal")}</option>
                <option value="high">{t("cases.createModal.priority.high")}</option>
                <option value="urgent">{t("cases.createModal.priority.urgent")}</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="cc-wf">
              {t("cases.createModal.field.workflow")}{" "}
              <span className="text-red-600">{t("cases.createModal.field.workflowRequired")}</span>
            </label>
            <select
              id="cc-wf"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={workflowKey}
              onChange={(e) => setWorkflowKey(e.target.value)}
              disabled={loadingWf}
              required
            >
              <option value="">
                {loadingWf ? t("cases.createModal.loadingWorkflows") : t("cases.createModal.selectWorkflow")}
              </option>
              {workflows.map((w) => (
                <option key={w.id} value={w.key ?? ""} disabled={!w.key}>
                  {w.name}
                  {typeof w.version === "number" ? ` (v${w.version})` : ""}
                  {w.key ? ` — ${w.key}` : ` ${t("cases.createModal.missingKey")}`}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">{t("cases.createModal.workflowHint")}</p>
            {!loadingWf && workflows.length === 0 && (
              <p className="text-[11px] text-amber-700 mt-1">{t("cases.createModal.noWorkflows")}</p>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting || !workflowKey.trim() || workflows.length === 0}
              className="px-4 py-2 text-sm font-semibold bg-primary-container text-white rounded-lg disabled:opacity-50"
            >
              {submitting ? t("cases.createModal.creating") : t("cases.createModal.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
