import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import type { WorkflowGuideStep } from "@/components/CaseWorkflowGuidePanel";
import { formatCaseUpdated } from "@/lib/casesApi";

export type ProgressAvailableAction = {
  id: string;
  name: string;
  toStepId: string;
  requiresComment: boolean;
  allowedRoleIds?: string[];
  toStep?: { id: string; name: string; key: string } | null;
  timeLimitType?: string;
  timeLimitAmount?: number | null;
  timeLimitUnit?: string | null;
  deadlineAt?: string | null;
  isPastDue?: boolean;
};

type HistoryRow = {
  id: string;
  transition?: { name?: string; id?: string } | null;
  actor?: { firstName?: string; lastName?: string } | null;
  comment?: string | null;
  transitionedAt: string;
  fromStep?: { id: string; name: string; key: string } | null;
  toStep?: { id: string; name: string; key: string } | null;
};

type Guide = {
  steps: WorkflowGuideStep[];
  transitions: { id: string; name: string; fromStepId: string; toStepId: string }[];
};

type Props = {
  guide: Guide | null | undefined;
  availableActions: ProgressAvailableAction[];
  history: HistoryRow[];
  attachmentBlocked: boolean;
  currentStepAttachmentCount: number;
  caseClosed: boolean;
  onExecuteAction: (action: ProgressAvailableAction) => void;
  transitionRoleLabels: (ids?: string[]) => string[];
  senderProgress?: { range?: string; lastUpdatedAt?: string | null } | null;
};

function progressTimingCaption(
  action: ProgressAvailableAction,
  t: (key: string, opts?: Record<string, unknown>) => string,
): string | null {
  const type = action.timeLimitType;
  const amt = action.timeLimitAmount;
  const unit = action.timeLimitUnit;
  if (!type || type === "NONE" || amt == null || amt < 1 || (unit !== "HOURS" && unit !== "DAYS")) return null;
  const unitLabel = unit === "DAYS" ? t("cases.detail.timing.dayUnit") : t("cases.detail.timing.hourUnit");
  const label = type === "DEADLINE" ? t("modals.caseProgress.deadline") : t("modals.caseProgress.suggestedTarget");
  if (action.deadlineAt) {
    const when = new Date(action.deadlineAt);
    const overdue = action.isPastDue;
    const suffix =
      overdue && type === "DEADLINE"
        ? t("cases.detail.timing.exceededBlocked")
        : overdue
          ? t("cases.detail.timing.exceededGuidance")
          : "";
    return `${label}: ${when.toLocaleString()}${suffix}`;
  }
  return t("cases.detail.timing.within", { label, amount: amt, unit: unitLabel });
}

export default function CaseTaskProgressView({
  guide,
  availableActions,
  history,
  attachmentBlocked,
  currentStepAttachmentCount,
  caseClosed,
  onExecuteAction,
  transitionRoleLabels,
  senderProgress,
}: Props) {
  const { t } = useTranslation();
  const steps = guide?.steps ?? [];
  const transitions = guide?.transitions ?? [];

  const completedCount = useMemo(() => steps.filter((s) => s.phase === "completed").length, [steps]);
  const total = steps.length;
  const hasCurrent = steps.some((s) => s.phase === "current");

  const progressPercent = useMemo(() => {
    if (total === 0) return 0;
    if (caseClosed) return 100;
    const currentBoost = hasCurrent ? 0.35 : 0;
    return Math.min(100, Math.round(((completedCount + currentBoost) / total) * 100));
  }, [total, completedCount, hasCurrent, caseClosed]);

  const pathChronological = useMemo(() => {
    return [...history]
      .filter((h) => h.toStep)
      .sort((a, b) => new Date(a.transitionedAt).getTime() - new Date(b.transitionedAt).getTime());
  }, [history]);

  const outgoingByStep = useMemo(() => {
    const m = new Map<string, number>();
    for (const t of transitions) {
      m.set(t.fromStepId, (m.get(t.fromStepId) ?? 0) + 1);
    }
    return m;
  }, [transitions]);

  if (!guide || steps.length === 0) {
    const stage = senderProgress?.range ? String(senderProgress.range) : "";
    if (stage) {
      const percentByRange: Record<string, number> = {
        Received: 15,
        Assigned: 45,
        "Being worked on": 65,
        "Near completion": 85,
        Completed: 100,
        Rejected: 0,
      };
      const percent = percentByRange[stage] ?? 15;
      return (
        <div className="p-lg max-w-3xl mx-auto w-full">
          <div className="bg-white border border-outline-variant rounded-xl p-6 shadow-sm">
            <h2 className="font-h3 text-slate-800 flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary">route</span>
              Task progress
            </h2>
            <p className="text-sm text-secondary max-w-3xl mb-4">
              This case is currently held by another agency. You can see a safe progress range only.
            </p>

            <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
              <span className="text-label-caps text-secondary text-xs">Safe progress</span>
              <span className="text-sm font-bold text-slate-800">{stage}</span>
            </div>

            <div className="h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
              <div
                className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-600 transition-all duration-500"
                style={{ width: `${percent}%` }}
              />
            </div>

            <p className="text-[11px] text-slate-500 mt-2">
              {senderProgress?.lastUpdatedAt
                ? `Last updated: ${new Date(senderProgress.lastUpdatedAt).toLocaleString()}`
                : `Last updated: —`}
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-lg max-w-3xl mx-auto">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-900 text-sm">
          <p className="font-semibold mb-2">No workflow progress to show</p>
          <p>This case has no linked workflow steps in state, or the workflow definition could not be loaded. Open the case
          summary to see case details, or contact an administrator if a workflow should be attached.</p>
        </div>
      </div>
    );
  }

  const currentStep = steps.find((s) => s.phase === "current");

  return (
    <div className="p-lg flex-1 max-w-5xl mx-auto w-full space-y-lg pb-10">
      <div>
        <h2 className="font-h3 text-slate-800 flex items-center gap-2 mb-1">
          <span className="material-symbols-outlined text-primary">route</span>
          Task progress
        </h2>
        <p className="text-sm text-secondary max-w-3xl">
          Steps follow your organization&apos;s workflow. Work the case in order: finish what&apos;s required at each step, then
          use a <strong>transition</strong> (action) to move forward. Only moves defined by your workflow are allowed.
        </p>
      </div>

      <div className="bg-white border border-outline-variant rounded-xl p-md shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <span className="text-label-caps text-secondary text-xs">Overall progress</span>
          <span className="text-sm font-bold text-slate-800">
            {completedCount} of {total} steps completed
            {currentStep ? (
              <span className="font-normal text-teal-700 ml-2">· Now: {currentStep.name}</span>
            ) : caseClosed ? (
              <span className="font-normal text-slate-600 ml-2">· Case closed</span>
            ) : null}
          </span>
        </div>
        <div className="h-3 rounded-full bg-slate-100 overflow-hidden border border-slate-200">
          <div
            className="h-full rounded-full bg-gradient-to-r from-teal-500 to-teal-600 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <p className="text-[11px] text-slate-500 mt-2">
          {caseClosed ? t("modals.caseProgress.closedHint") : t("modals.caseProgress.openHint")}
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-lg">
        <div className="lg:col-span-7 space-y-4">
          <h3 className="font-label-caps text-secondary text-xs flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">linear_scale</span>
            Workflow steps (design order)
          </h3>
          <div className="relative pl-2">
            <div className="absolute left-[15px] top-3 bottom-3 w-0.5 bg-slate-200 rounded" aria-hidden />
            <ul className="space-y-0 relative">
              {steps.map((s, idx) => {
                const branches = outgoingByStep.get(s.id) ?? 0;
                const isLast = idx === steps.length - 1;
                const node =
                  s.phase === "completed" ? (
                    <span className="flex h-8 w-8 shrink-0 rounded-full bg-teal-600 text-white items-center justify-center shadow-sm z-10 border-2 border-white">
                      <span className="material-symbols-outlined text-[18px]">check</span>
                    </span>
                  ) : s.phase === "current" ? (
                    <span className="flex h-8 w-8 shrink-0 rounded-full bg-white ring-2 ring-teal-500 ring-offset-2 items-center justify-center z-10 border border-teal-400">
                      <span className="material-symbols-outlined text-teal-600 text-[20px] animate-pulse">radio_button_checked</span>
                    </span>
                  ) : (
                    <span className="flex h-8 w-8 shrink-0 rounded-full bg-slate-100 border-2 border-dashed border-slate-300 items-center justify-center z-10">
                      <span className="text-xs font-bold text-slate-400">{idx + 1}</span>
                    </span>
                  );

                const cardClass =
                  s.phase === "current"
                    ? "border-teal-400 bg-teal-50/50 shadow-sm"
                    : s.phase === "completed"
                      ? "border-slate-200 bg-white"
                      : "border-slate-200 bg-slate-50/60 opacity-90";

                return (
                  <li key={s.id} className={`flex gap-4 ${isLast ? "" : "pb-6"}`}>
                    {node}
                    <div className={`flex-1 min-w-0 rounded-lg border px-3 py-2.5 ${cardClass}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-800">{s.name}</span>
                        <span className="text-[10px] font-mono text-slate-400">{s.key}</span>
                        {s.isInitial && (
                          <span className="text-[10px] font-bold uppercase bg-teal-100 text-teal-800 px-1.5 py-0.5 rounded">
                            Start
                          </span>
                        )}
                        {s.isFinal && (
                          <span className="text-[10px] font-bold uppercase bg-amber-100 text-amber-900 px-1.5 py-0.5 rounded">
                            End
                          </span>
                        )}
                        {s.requiresAttachment && (
                          <span className="text-[10px] font-bold uppercase bg-sky-100 text-sky-900 px-1.5 py-0.5 rounded">
                            {t("cases.detail.needsFile")}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1">
                        {s.phase === "completed" && t("modals.caseProgress.finished")}
                        {s.phase === "current" && t("modals.caseProgress.inProgress")}
                        {s.phase === "upcoming" && t("modals.caseProgress.upcoming")}
                      </p>
                      {branches > 1 && (
                        <p className="text-[11px] text-amber-800 mt-1.5 flex items-start gap-1">
                          <span className="material-symbols-outlined text-[14px] shrink-0">call_split</span>
                          {branches} different transitions leave this step; choose the one that matches the case.
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className="lg:col-span-5 space-y-4">
          <div
            id="case-next-actions"
            tabIndex={-1}
            className="bg-white border border-outline-variant rounded-xl p-md shadow-sm scroll-mt-24 outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2"
          >
            <h3 className="font-label-caps text-secondary text-xs mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm text-primary">bolt</span>
              Transitions you can take now
            </h3>
            {currentStep?.requiresAttachment && (
              <div
                className={`mb-3 text-xs rounded-lg p-3 border ${
                  attachmentBlocked
                    ? "bg-amber-50 border-amber-200 text-amber-900"
                    : "bg-teal-50 border-teal-200 text-teal-900"
                }`}
              >
                {attachmentBlocked ? (
                  <p>
                    <strong>Attachment required:</strong> add at least one file on this step (Attachments tab) before any
                    transition. Linked files for this step: {currentStepAttachmentCount}.
                  </p>
                ) : (
                  <p>
                    This step expects supporting files. You have {currentStepAttachmentCount} linked — you may proceed when
                    ready.
                  </p>
                )}
              </div>
            )}
            {caseClosed ? (
              <p className="text-sm text-secondary">This case is closed — no further transitions can be run.</p>
            ) : availableActions.length === 0 ? (
              <p className="text-sm text-secondary">
                {currentStep?.isFinal
                  ? t("modals.caseProgress.terminal")
                  : t("modals.caseProgress.noActions")}
              </p>
            ) : (
              <ul className="space-y-2">
                {availableActions.map((action) => {
                  const restricted = Array.isArray(action.allowedRoleIds) && action.allowedRoleIds.length > 0;
                  const deadlineBlocked = action.timeLimitType === "DEADLINE" && Boolean(action.isPastDue);
                  const timingLine = progressTimingCaption(action, t);
                  return (
                    <li key={action.id}>
                      <button
                        type="button"
                        disabled={attachmentBlocked || caseClosed || deadlineBlocked}
                        onClick={() => onExecuteAction(action)}
                        className="w-full text-left rounded-lg border border-teal-200 bg-teal-50/80 hover:bg-teal-100 px-3 py-2.5 transition-colors disabled:opacity-45 disabled:pointer-events-none"
                      >
                        <span className="font-semibold text-slate-800">{action.name}</span>
                        {action.toStep?.name && (
                          <span className="text-sm text-teal-800 block mt-0.5">→ {action.toStep.name}</span>
                        )}
                        {action.requiresComment && (
                          <span className="text-[11px] text-slate-600 block mt-1">Formal letter required.</span>
                        )}
                        {timingLine ? (
                          <span
                            className={`text-[11px] block mt-1 ${
                              action.isPastDue && action.timeLimitType === "DEADLINE"
                                ? "text-red-700"
                                : action.isPastDue
                                  ? "text-amber-800"
                                  : "text-slate-600"
                            }`}
                          >
                            {timingLine}
                          </span>
                        ) : null}
                      </button>
                      {restricted && (
                        <p className="text-[10px] text-slate-500 mt-1 px-1">
                          Roles: {transitionRoleLabels(action.allowedRoleIds).join(", ") || "—"}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-md">
            <h3 className="font-label-caps text-secondary text-xs mb-3 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">history</span>
              Path so far (transitions taken)
            </h3>
            {pathChronological.length === 0 ? (
              <p className="text-sm text-slate-600">No moves recorded yet beyond case creation.</p>
            ) : (
              <ol className="space-y-2 text-sm">
                {pathChronological.map((row) => (
                  <li key={row.id} className="flex flex-col gap-0.5 border-l-2 border-teal-300 pl-3 py-1">
                    <span className="font-medium text-slate-800">
                      {row.transition?.name ?? t("modals.caseProgress.stepChange")}
                      {row.fromStep && row.toStep && (
                        <span className="font-normal text-slate-600">
                          {" "}
                          ({row.fromStep.name} → {row.toStep.name})
                        </span>
                      )}
                    </span>
                    <span className="text-[11px] text-slate-500">
                      {formatCaseUpdated(row.transitionedAt)}
                      {row.actor
                        ? ` · ${row.actor.firstName ?? ""} ${row.actor.lastName ?? ""}`.trim()
                        : ""}
                    </span>
                  </li>
                ))}
              </ol>
            )}
          </div>

          {transitions.length > 0 && (
            <div className="text-[11px] text-slate-500 border border-dashed border-slate-200 rounded-lg p-3 bg-white">
              <p className="font-semibold text-slate-600 mb-1">How this workflow is structured</p>
              <p>
                {transitions.length} transition{transitions.length === 1 ? "" : "s"} connect steps. Your case always sits on
                exactly one step; each move runs one transition and is recorded in the path above and in the Activity log.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
