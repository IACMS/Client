import { roleNamesForIds, type RbacRoleRow } from "@/lib/workflowRoles";
import type { ApiWorkflow, WorkflowStep, WorkflowTransition } from "@/hooks/useWorkflow";

function transitionLimitShort(t: WorkflowTransition): string | null {
  const a = t.timeLimitAmount;
  const u = t.timeLimitUnit;
  if (a == null || a < 1 || (u !== "HOURS" && u !== "DAYS")) return null;
  return u === "DAYS" ? `${a}d` : `${a}h`;
}

type Props = {
  step: WorkflowStep;
  workflow: ApiWorkflow;
  rbacRoles: RbacRoleRow[];
  /** True when the user can edit the workflow definition. */
  canConfigure: boolean;
  onEditStep: (step: WorkflowStep) => void;
  onEditTransition: (t: WorkflowTransition) => void;
  onDeleteTransition: (t: WorkflowTransition) => void;
};

/**
 * Single step "card" with its outgoing transitions. Mutate affordances only
 * render when the workflow is a draft AND the user can configure workflows.
 */
export default function WorkflowStepCard({
  step,
  workflow,
  rbacRoles,
  canConfigure,
  onEditStep,
  onEditTransition,
  onDeleteTransition,
}: Props) {
  const stepRoles = roleNamesForIds(rbacRoles, step.allowedRoleIds);
  const isDraft = workflow.status === "DRAFT";
  const isEditable = isDraft && canConfigure;
  const outgoing = workflow.transitions.filter((t) => t.fromStepId === step.id);

  return (
    <div
      className={`bg-white border-2 rounded-xl p-4 shadow-sm relative ${
        step.isInitial ? "border-teal-500" : step.isFinal ? "border-amber-500" : "border-slate-200"
      }`}
    >
      {isEditable && (
        <button
          type="button"
          onClick={() => onEditStep(step)}
          className="absolute top-2 right-2 p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
          aria-label="Edit step"
        >
          <span className="material-symbols-outlined text-[18px]">edit</span>
        </button>
      )}
      {step.isInitial && (
        <div className="absolute -top-3 left-4 bg-teal-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          INITIAL
        </div>
      )}
      {step.isFinal && (
        <div className="absolute -top-3 left-4 bg-amber-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          FINAL
        </div>
      )}

      <h3 className="font-bold text-slate-800 mt-2 pr-10">{step.name}</h3>
      <p className="text-[10px] text-slate-400 font-mono mb-2">key: {step.key}</p>
      {step.requiresAttachment && (
        <p className="text-[10px] font-semibold text-teal-800 bg-teal-50 border border-teal-100 rounded px-2 py-1 mb-2 inline-flex items-center gap-1">
          <span className="material-symbols-outlined text-[14px]">attach_file</span>
          Attachment required to proceed
        </p>
      )}
      {stepRoles.length > 0 ? (
        <p className="text-[10px] text-slate-600 mb-3">
          <span className="font-semibold">Roles:</span> {stepRoles.join(", ")}
        </p>
      ) : (
        <p className="text-[10px] text-slate-400 mb-3">Roles: any</p>
      )}

      <div className="space-y-2 border-t border-slate-100 pt-3">
        <p className="text-xs font-label-caps text-slate-500">OUTGOING TRANSITIONS</p>
        {outgoing.length === 0 && <p className="text-xs text-slate-400 italic">None</p>}
        {outgoing.map((t) => {
          const target = workflow.steps.find((s) => s.id === t.toStepId);
          const trRoles = roleNamesForIds(rbacRoles, t.allowedRoleIds);
          const lim = transitionLimitShort(t);
          return (
            <div
              key={t.id}
              className="bg-slate-50 border border-slate-200 rounded p-2 text-xs flex flex-col gap-1"
            >
              <div className="flex justify-between items-start gap-2">
                <div className="flex justify-between items-center gap-2 flex-1 min-w-0">
                  <span className="font-semibold text-primary truncate">{t.name}</span>
                  <span className="flex items-center gap-1 text-slate-500 shrink-0">
                    <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                    {target?.name}
                  </span>
                </div>
                {isEditable && (
                  <div className="flex gap-0.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => onEditTransition(t)}
                      className="p-1 rounded text-slate-600 hover:bg-slate-200"
                      aria-label="Edit transition"
                    >
                      <span className="material-symbols-outlined text-[16px]">edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteTransition(t)}
                      className="p-1 rounded text-red-700 hover:bg-red-100"
                      aria-label="Delete transition"
                    >
                      <span className="material-symbols-outlined text-[16px]">close</span>
                    </button>
                  </div>
                )}
              </div>
              {trRoles.length > 0 ? (
                <span className="text-[10px] text-slate-500">Execute: {trRoles.join(", ")}</span>
              ) : (
                <span className="text-[10px] text-slate-400">Execute: any role</span>
              )}
              {t.timeLimitType === "DEADLINE" && lim && (
                <span className="text-[10px] font-semibold text-red-800 bg-red-50 border border-red-100 rounded px-1.5 py-0.5 inline-flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[12px]">schedule</span>
                  Deadline {lim}
                </span>
              )}
              {t.timeLimitType === "RECOMMENDATION" && lim && (
                <span className="text-[10px] font-semibold text-sky-900 bg-sky-50 border border-sky-100 rounded px-1.5 py-0.5 inline-flex items-center gap-0.5">
                  <span className="material-symbols-outlined text-[12px]">lightbulb</span>
                  Target {lim}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
