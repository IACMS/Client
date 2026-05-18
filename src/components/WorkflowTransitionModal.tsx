import { FormEvent, useEffect, useMemo, useState } from "react";
import { ApiError, apiPost, apiPut } from "@/lib/api";
import {
  fetchRbacRoles,
  prepareRolesForWorkflowPickers,
  humanizeRoleName,
  type RbacRoleRow,
} from "@/lib/workflowRoles";

export type WorkflowTransitionEditPayload = {
  id: string;
  name: string;
  description?: string | null;
  fromStepId: string;
  toStepId: string;
  requiresComment: boolean;
  allowedRoleIds?: string[];
  timeLimitType?: string;
  timeLimitAmount?: number | null;
  timeLimitUnit?: string | null;
};

export type ChainTransitionOption = { id: string; toStepId: string; label: string };

type StepOption = { id: string; key: string; name: string; isFinal?: boolean };

type Props = {
  open: boolean;
  onClose: () => void;
  workflowTenantId?: string;
  workflowId: string;
  steps: StepOption[];
  /** When set, “Add transition” can start from another transition’s destination step. */
  chainTransitionOptions?: ChainTransitionOption[];
  editTransition?: WorkflowTransitionEditPayload | null;
  onSaved: () => void;
};

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
    <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-lg p-2 space-y-1 bg-slate-50">
      {roles.map((r) => (
        <label key={r.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            className="rounded text-primary shrink-0"
            checked={selectedIds.includes(r.id)}
            onChange={() => onToggle(r.id)}
          />
          <span className="text-sm">{humanizeRoleName(r.name)}</span>
        </label>
      ))}
    </div>
  );
}

export default function WorkflowTransitionModal({
  open,
  onClose,
  workflowTenantId,
  workflowId,
  steps,
  chainTransitionOptions = [],
  editTransition,
  onSaved,
}: Props) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [fromStepId, setFromStepId] = useState("");
  const [toStepId, setToStepId] = useState("");
  const [fromSource, setFromSource] = useState<"step" | "chain">("step");
  const [chainTransitionId, setChainTransitionId] = useState("");
  const [toMode, setToMode] = useState<"step" | "terminal">("step");
  const [requiresComment, setRequiresComment] = useState(false);
  const [timeLimitType, setTimeLimitType] = useState<"NONE" | "RECOMMENDATION" | "DEADLINE">("NONE");
  const [timeLimitAmount, setTimeLimitAmount] = useState("");
  const [timeLimitUnit, setTimeLimitUnit] = useState<"HOURS" | "DAYS">("DAYS");
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);
  const [roles, setRoles] = useState<RbacRoleRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const finalSteps = useMemo(() => steps.filter((s) => s.isFinal), [steps]);
  const canAutoClose = finalSteps.length === 1;
  const canChain = !editTransition && chainTransitionOptions.length > 0;

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      if (!workflowTenantId) {
        if (!cancelled) setRoles([]);
        return;
      }
      const list = prepareRolesForWorkflowPickers(await fetchRbacRoles({ tenantId: workflowTenantId }));
      if (!cancelled) setRoles(list);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, workflowTenantId]);

  useEffect(() => {
    if (!open) return;
    const finals = steps.filter((s) => s.isFinal);
    const soleFinal = finals.length === 1 ? finals[0] : null;

    if (editTransition) {
      setName(editTransition.name);
      setDescription(editTransition.description ?? "");
      setFromStepId(editTransition.fromStepId);
      setToStepId(editTransition.toStepId);
      setRequiresComment(editTransition.requiresComment);
      setSelectedRoleIds([...(editTransition.allowedRoleIds ?? [])]);
      const tl = editTransition.timeLimitType === "RECOMMENDATION" || editTransition.timeLimitType === "DEADLINE"
        ? editTransition.timeLimitType
        : "NONE";
      setTimeLimitType(tl);
      setTimeLimitAmount(
        editTransition.timeLimitAmount != null && editTransition.timeLimitAmount > 0
          ? String(editTransition.timeLimitAmount)
          : "",
      );
      setTimeLimitUnit(
        editTransition.timeLimitUnit === "HOURS" || editTransition.timeLimitUnit === "DAYS"
          ? editTransition.timeLimitUnit
          : "DAYS",
      );
      setFromSource("step");
      setChainTransitionId("");
      setToMode(soleFinal && editTransition.toStepId === soleFinal.id ? "terminal" : "step");
    } else {
      setName("");
      setDescription("");
      setFromStepId("");
      setToStepId("");
      setRequiresComment(false);
      setSelectedRoleIds([]);
      setTimeLimitType("NONE");
      setTimeLimitAmount("");
      setTimeLimitUnit("DAYS");
      setFromSource("step");
      setChainTransitionId("");
      setToMode("step");
    }
    setErrorMessage(null);
    setSubmitting(false);
  }, [open, editTransition]);

  function handleClose() {
    onClose();
  }

  if (!open) return null;

  function toggleRole(id: string) {
    setSelectedRoleIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const n = name.trim();
    if (!n) {
      setErrorMessage("Transition name is required.");
      return;
    }

    const chainSel = chainTransitionOptions.find((c) => c.id === chainTransitionId);
    const effFrom =
      !editTransition && fromSource === "chain" ? (chainSel?.toStepId ?? "") : fromStepId;
    const resolvedToId =
      toMode === "terminal" && canAutoClose ? finalSteps[0].id : toStepId;

    if (!editTransition) {
      if (fromSource === "chain") {
        if (!chainTransitionId || !chainSel) {
          setErrorMessage("Choose which transition this one chains after.");
          return;
        }
      } else if (!fromStepId) {
        setErrorMessage("Choose a from step.");
        return;
      }
      if (toMode === "terminal") {
        if (!canAutoClose) {
          setErrorMessage("Automatic closing transitions need exactly one final step in the workflow.");
          return;
        }
      } else if (!toStepId) {
        setErrorMessage("Choose a destination step.");
        return;
      }
    } else {
      if (!fromStepId) {
        setErrorMessage("Choose a from step.");
        return;
      }
      if (toMode === "terminal") {
        if (!canAutoClose) {
          setErrorMessage("Automatic closing transitions need exactly one final step in the workflow.");
          return;
        }
      } else if (!toStepId) {
        setErrorMessage("Choose a destination step.");
        return;
      }
    }

    if (effFrom && resolvedToId && effFrom === resolvedToId) {
      setErrorMessage("From and to steps must differ.");
      return;
    }

    if (timeLimitType !== "NONE") {
      const amt = parseInt(timeLimitAmount.trim(), 10);
      if (!Number.isFinite(amt) || amt < 1) {
        setErrorMessage("Enter a positive number for the time limit.");
        return;
      }
    }

    setErrorMessage(null);
    setSubmitting(true);
    try {
      const d = description.trim();
      if (editTransition) {
        const body: Record<string, unknown> = {
          name: n,
          fromStepId,
          toStepId: resolvedToId,
          requiresComment,
          allowedRoleIds: selectedRoleIds,
          timeLimitType,
          timeLimitAmount: timeLimitType === "NONE" ? null : parseInt(timeLimitAmount.trim(), 10),
          timeLimitUnit: timeLimitType === "NONE" ? null : timeLimitUnit,
        };
        if (d) body.description = d;
        else body.description = null;
        await apiPut(
          `/api/v1/workflows/${encodeURIComponent(workflowId)}/transitions/${encodeURIComponent(editTransition.id)}`,
          body,
        );
      } else {
        const body: Record<string, unknown> = {
          name: n,
          requiresComment,
          allowedRoleIds: selectedRoleIds,
          toStepId: resolvedToId,
          timeLimitType,
          timeLimitAmount: timeLimitType === "NONE" ? null : parseInt(timeLimitAmount.trim(), 10),
          timeLimitUnit: timeLimitType === "NONE" ? null : timeLimitUnit,
        };
        if (d) body.description = d;
        if (fromSource === "chain") {
          body.fromTransitionId = chainTransitionId;
        } else {
          body.fromStepId = fromStepId;
        }
        await apiPost(`/api/v1/workflows/${encodeURIComponent(workflowId)}/transitions`, body);
      }
      onSaved();
      handleClose();
    } catch (err) {
      setErrorMessage(
        err instanceof ApiError ? err.message : editTransition ? "Failed to update transition." : "Failed to add transition.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const soleFinalName = canAutoClose ? finalSteps[0].name : null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
      role="presentation"
      onClick={handleClose}
    >
      <div
        role="dialog"
        aria-labelledby="wf-tr-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-lg max-w-md w-full border border-slate-200 max-h-[90dvh] overflow-y-auto"
      >
        <div className="p-4 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
          <h2 id="wf-tr-title" className="font-h3 text-primary">
            {editTransition ? "Edit transition" : "Add transition"}
          </h2>
          <button type="button" onClick={handleClose} className="p-1 rounded hover:bg-slate-100" aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          {steps.length < 2 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
              Add at least two steps before connecting them with a transition.
            </div>
          )}
          {errorMessage && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{errorMessage}</div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="tr-name">
              Transition name
            </label>
            <input
              id="tr-name"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Submit for approval"
              required
            />
          </div>

          {!editTransition && canChain && (
            <fieldset className="space-y-2 border border-slate-100 rounded-lg p-3">
              <legend className="text-xs font-semibold text-slate-600 px-1">From</legend>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="from-source"
                  className="text-primary"
                  checked={fromSource === "step"}
                  onChange={() => setFromSource("step")}
                />
                A step
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input
                  type="radio"
                  name="from-source"
                  className="text-primary"
                  checked={fromSource === "chain"}
                  onChange={() => setFromSource("chain")}
                />
                After another transition (same as starting from its destination step)
              </label>
            </fieldset>
          )}

          {(!editTransition && fromSource === "step") || editTransition ? (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="tr-from">
                From step
              </label>
              <select
                id="tr-from"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                value={fromStepId}
                onChange={(e) => setFromStepId(e.target.value)}
                required={!editTransition ? fromSource === "step" : true}
              >
                <option value="">Select step…</option>
                {steps.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.key})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="tr-chain">
                After transition
              </label>
              <select
                id="tr-chain"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                value={chainTransitionId}
                onChange={(e) => setChainTransitionId(e.target.value)}
                required
              >
                <option value="">Select transition…</option>
                {chainTransitionOptions.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-500 mt-1">The new transition starts from the step this one leads to.</p>
            </div>
          )}

          <fieldset className="space-y-2 border border-slate-100 rounded-lg p-3">
            <legend className="text-xs font-semibold text-slate-600 px-1">To</legend>
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
              <input
                type="radio"
                name="to-mode"
                className="text-primary"
                checked={toMode === "step"}
                onChange={() => setToMode("step")}
              />
              Specific step
            </label>
            <label className={`flex items-center gap-2 text-sm cursor-pointer ${canAutoClose ? "text-slate-700" : "text-slate-400"}`}>
              <input
                type="radio"
                name="to-mode"
                className="text-primary"
                disabled={!canAutoClose}
                checked={toMode === "terminal"}
                onChange={() => setToMode("terminal")}
              />
              Closing (final) — use the single final step
              {!canAutoClose && <span className="text-[11px] text-slate-400">(needs one final step)</span>}
            </label>
          </fieldset>

          {toMode === "step" ? (
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="tr-to">
                To step
              </label>
              <select
                id="tr-to"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                value={toStepId}
                onChange={(e) => setToStepId(e.target.value)}
                required
              >
                <option value="">Select step…</option>
                {steps.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.key}){s.isFinal ? " — final" : ""}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            soleFinalName && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                <span className="text-xs font-semibold text-slate-500 block mb-0.5">Destination</span>
                → {soleFinalName} (final)
              </div>
            )
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="tr-desc">
              Description <span className="font-normal text-slate-400">(optional)</span>
            </label>
            <input
              id="tr-desc"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          <div>
            <span className="block text-xs font-semibold text-slate-600 mb-1">Roles allowed to execute</span>
            <p className="text-[11px] text-slate-500 mb-2">
              Empty = any role may execute this transition. System admin and per-tenant intake roles are hidden; use Case manager
              for handlers.
            </p>
            <RolePicker roles={roles} selectedIds={selectedRoleIds} onToggle={toggleRole} />
          </div>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={requiresComment}
              onChange={(e) => setRequiresComment(e.target.checked)}
              className="rounded text-primary"
            />
            Require comment when taking this transition
          </label>
          <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-3 space-y-2">
            <label className="block text-xs font-semibold text-slate-600" htmlFor="tr-time-type">
              Time on current step (optional)
            </label>
            <select
              id="tr-time-type"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
              value={timeLimitType}
              onChange={(e) =>
                setTimeLimitType(e.target.value as "NONE" | "RECOMMENDATION" | "DEADLINE")
              }
            >
              <option value="NONE">No time limit</option>
              <option value="RECOMMENDATION">Recommendation — show target time only</option>
              <option value="DEADLINE">Deadline — block this action after time expires</option>
            </select>
            {timeLimitType !== "NONE" && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1" htmlFor="tr-time-amt">
                      Amount
                    </label>
                    <input
                      id="tr-time-amt"
                      type="number"
                      min={1}
                      step={1}
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                      value={timeLimitAmount}
                      onChange={(e) => setTimeLimitAmount(e.target.value)}
                      placeholder="e.g. 3"
                    />
                  </div>
                  <div className="w-36">
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1" htmlFor="tr-time-unit">
                      Unit
                    </label>
                    <select
                      id="tr-time-unit"
                      className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
                      value={timeLimitUnit}
                      onChange={(e) => setTimeLimitUnit(e.target.value as "HOURS" | "DAYS")}
                    >
                      <option value="HOURS">Hours</option>
                      <option value="DAYS">Days</option>
                    </select>
                  </div>
                </div>
                <p className="text-[11px] text-slate-500">
                  Clock starts when the case enters this step (or at case creation if there is no prior history). Minutes are
                  not supported — use hours or days only.
                </p>
              </div>
            )}
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
              disabled={submitting || steps.length < 2}
              className="flex-1 bg-primary text-white py-2.5 rounded-lg font-semibold hover:bg-primary-container disabled:opacity-50"
            >
              {submitting ? "Saving…" : editTransition ? "Save transition" : "Add transition"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
