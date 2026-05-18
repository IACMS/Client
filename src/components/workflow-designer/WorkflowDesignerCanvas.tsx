import WorkflowStepCard from "./WorkflowStepCard";
import type { RbacRoleRow } from "@/lib/workflowRoles";
import type { ApiWorkflow, WorkflowStep, WorkflowTransition } from "@/hooks/useWorkflow";

type Props = {
  workflow: ApiWorkflow;
  rbacRoles: RbacRoleRow[];
  canConfigure: boolean;
  onAddStep: () => void;
  onEditStep: (step: WorkflowStep) => void;
  onEditTransition: (t: WorkflowTransition) => void;
  onDeleteTransition: (t: WorkflowTransition) => void;
};

/**
 * Tile grid that renders step cards. Empty-state CTA only renders for users
 * with the configure permission.
 */
export default function WorkflowDesignerCanvas({
  workflow,
  rbacRoles,
  canConfigure,
  onAddStep,
  onEditStep,
  onEditTransition,
  onDeleteTransition,
}: Props) {
  return (
    <div className="flex-1 p-6 overflow-auto bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] relative">
      {workflow.steps.length === 0 ? (
        <div className="h-full flex flex-col items-center justify-center text-slate-400">
          <span className="material-symbols-outlined text-6xl mb-4 opacity-50">account_tree</span>
          <p className="text-lg">Canvas is empty</p>
          <p className="text-sm">Add a step to begin designing.</p>
          {workflow.status === "DRAFT" && canConfigure && (
            <button
              type="button"
              onClick={onAddStep}
              className="mt-6 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary-container"
            >
              Add first step
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 auto-rows-max">
          {workflow.steps.map((step) => (
            <WorkflowStepCard
              key={step.id}
              step={step}
              workflow={workflow}
              rbacRoles={rbacRoles}
              canConfigure={canConfigure}
              onEditStep={onEditStep}
              onEditTransition={onEditTransition}
              onDeleteTransition={onDeleteTransition}
            />
          ))}
        </div>
      )}
    </div>
  );
}
