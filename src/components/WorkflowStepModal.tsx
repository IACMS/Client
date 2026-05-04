import { FormEvent, useEffect, useState } from "react";
import { ApiError, apiPost, apiPut } from "@/lib/api";
import { fetchRbacRoles, type RbacRoleRow } from "@/lib/workflowRoles";

export type WorkflowStepEditPayload = {
  id: string;
  name: string;
  key: string;
  description?: string | null;
  isInitial: boolean;
  isFinal: boolean;
  requiresAttachment?: boolean;
  allowedRoleIds?: string[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  workflowId: string;
  editStep?: WorkflowStepEditPayload | null;
  onSaved: () => void;
};

function slugifyKey(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function RolePicker({
  roles,
  selectedIds,
  onToggle,
}: {
  roles: RbacRoleRow[];
  selectedIds: string[];
  onToggle: (id: string) => void;
}) {
  if (roles.length === 0) {
    return <p className="text-xs text-slate-500">No roles returned (check RBAC / permissions).</p>;
  }
  return (
    <div className="max-h-40 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1 bg-slate-50">
      {roles.map((r) => (
        <label key={r.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            className="rounded text-primary shrink-0"
            checked={selectedIds.includes(r.id)}
            onChange={() => onToggle(r.id)}
          />
          <span className="font-mono text-xs">{r.name}</span>
        </label>
      ))}
    </div>
  );
}

export default function WorkflowStepModal({ open, onClose, workflowId, editStep, onSaved }: Props) {
  const [name, setName] = useState("");
  const [key, setKey] = useState("");
  const [keyManual, setKeyManual] = useState(false);
  const [description, setDescription] = useState("");
  const [isInitial, setIsInitial] = useState(false);
  const [isFinal, setIsFinal] = useState(false);
  const [requiresAttachment, setRequiresAttachment] = useState(false);
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [roles, setRoles] = useState<RbacRoleRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      const list = await fetchRbacRoles();
      if (!cancelled) setRoles(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (editStep) {
      setName(editStep.name);
      setKey(editStep.key);
      setKeyManual(true);
      setDescription(editStep.description ?? "");
      setIsInitial(editStep.isInitial);
      setIsFinal(editStep.isFinal);
      setRequiresAttachment(Boolean(editStep.requiresAttachment));
      setSelectedRoleIds([...(editStep.allowedRoleIds ?? [])]);
    } else {
      setName("");
      setKey("");
      setKeyManual(false);
      setDescription("");
      setIsInitial(false);
      setIsFinal(false);
      setRequiresAttachment(false);
      setSelectedRoleIds([]);
    }
    setErrorMessage(null);
    setSubmitting(false);
  }, [open, editStep]);

  function handleClose() {
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

  function toggleRole(id: string) {
    setSelectedRoleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    const k = key.trim();
    if (!n || !k) {
      setErrorMessage("Step name and key are required.");
      return;
    }
    if (isInitial && isFinal) {
      setErrorMessage("A step cannot be both initial and final.");
      return;
    }
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const d = description.trim();
      const body: Record<string, unknown> = {
        name: n,
        key: k,
        isInitial,
        isFinal,
        requiresAttachment,
        allowedRoleIds: selectedRoleIds,
      };
      if (d) body.description = d;

      if (editStep) {
        await apiPut(`/api/v1/workflows/${encodeURIComponent(workflowId)}/steps/${encodeURIComponent(editStep.id)}`, body);
      } else {
        await apiPost(`/api/v1/workflows/${encodeURIComponent(workflowId)}/steps`, body);
      }
      onSaved();
      handleClose();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : editStep ? "Failed to update step." : "Failed to add step.");
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
        aria-labelledby="wf-step-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-lg max-w-md w-full border border-slate-200 max-h-[90dvh] overflow-y-auto"
      >
        <div className="p-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 id="wf-step-title" className="font-h3 text-primary">
            {editStep ? "Edit step" : "Add step"}
          </h2>
          <button type="button" onClick={handleClose} className="p-1 rounded hover:bg-slate-100" aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{errorMessage}</div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="st-name">
              Step name
            </label>
            <input
              id="st-name"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder="e.g. Legal review"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="st-key">
              Step key
            </label>
            <input
              id="st-key"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
              value={key}
              onChange={(e) => onKeyChange(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="st-desc">
              Description <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="st-desc"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-600 mb-1">Roles allowed at this step</span>
            <p className="text-[11px] text-slate-500 mb-2">Empty = any role may view/act per transition rules.</p>
            <RolePicker roles={roles} selectedIds={selectedRoleIds} onToggle={toggleRole} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isInitial}
                onChange={(e) => {
                  setIsInitial(e.target.checked);
                  if (e.target.checked) setIsFinal(false);
                }}
                className="rounded text-primary"
              />
              Initial step (entry point)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={isFinal}
                onChange={(e) => {
                  setIsFinal(e.target.checked);
                  if (e.target.checked) setIsInitial(false);
                }}
                className="rounded text-primary"
              />
              Final step (terminal)
            </label>
            <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="checkbox"
                checked={requiresAttachment}
                onChange={(e) => setRequiresAttachment(e.target.checked)}
                className="rounded text-primary mt-0.5 shrink-0"
              />
              <span>
                Require attachment before leaving this step
                <span className="block text-[11px] font-normal text-slate-500 mt-0.5">
                  Case handlers must upload at least one file linked to this step before any outbound transition runs.
                </span>
              </span>
            </label>
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
              disabled={submitting}
              className="flex-1 bg-primary text-white py-2.5 rounded-lg font-semibold hover:bg-primary-container disabled:opacity-50"
            >
              {submitting ? "Saving…" : editStep ? "Save step" : "Add step"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
