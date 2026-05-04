import { useMemo } from "react";

export type WorkflowGuideStep = {
  id: string;
  name: string;
  key: string;
  position: number;
  isInitial: boolean;
  isFinal: boolean;
  requiresAttachment: boolean;
  phase: "completed" | "current" | "upcoming";
};

type Props = {
  guide:
    | {
        steps: WorkflowGuideStep[];
        transitions: { id: string; name: string; fromStepId: string; toStepId: string }[];
      }
    | null
    | undefined;
};

export default function CaseWorkflowGuidePanel({ guide }: Props) {
  const outgoingByStep = useMemo(() => {
    const m = new Map<string, number>();
    if (!guide?.transitions) return m;
    for (const t of guide.transitions) {
      m.set(t.fromStepId, (m.get(t.fromStepId) ?? 0) + 1);
    }
    return m;
  }, [guide?.transitions]);

  if (!guide?.steps?.length) return null;

  const stepById = new Map(guide.steps.map((s) => [s.id, s]));

  return (
    <div className="mb-4 rounded-lg border border-slate-200 bg-slate-50/80 p-3">
      <p className="text-[11px] font-label-caps text-slate-500 mb-2">GUIDED PATH</p>
      <p className="text-xs text-slate-600 mb-3 leading-relaxed">
        The case advances only through defined transitions from your current step—there is no ad hoc skipping. Use{" "}
        <strong>Available actions</strong> to move forward. Steps below follow the workflow&apos;s design order.
      </p>
      <ol className="space-y-2 max-h-52 overflow-y-auto pr-1">
        {guide.steps.map((s) => {
          const branches = outgoingByStep.get(s.id) ?? 0;
          const phaseStyles =
            s.phase === "current"
              ? "border-teal-500 bg-teal-50 ring-1 ring-teal-200"
              : s.phase === "completed"
                ? "border-slate-200 bg-white opacity-80"
                : "border-dashed border-slate-300 bg-white/60";

          return (
            <li
              key={s.id}
              className={`rounded-lg border px-3 py-2 text-sm ${phaseStyles}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <span className="font-semibold text-slate-800">{s.name}</span>
                  <span className="text-[10px] font-mono text-slate-400 ml-2">{s.key}</span>
                  {s.requiresAttachment && (
                    <span className="ml-2 text-[10px] font-semibold text-teal-800 bg-teal-100 px-1.5 py-0.5 rounded">
                      attachment
                    </span>
                  )}
                </div>
                <span
                  className={`shrink-0 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                    s.phase === "current"
                      ? "bg-teal-600 text-white"
                      : s.phase === "completed"
                        ? "bg-slate-200 text-slate-700"
                        : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {s.phase === "current" ? "Now" : s.phase === "completed" ? "Done" : "Later"}
                </span>
              </div>
              {branches > 1 && (
                <p className="text-[10px] text-amber-800 mt-1">
                  {branches} possible routes—pick the action that matches your situation when you reach this step.
                </p>
              )}
            </li>
          );
        })}
      </ol>
      {guide.transitions?.length ? (
        <p className="text-[10px] text-slate-500 mt-3 pt-2 border-t border-slate-200">
          {guide.transitions.length} transition{guide.transitions.length === 1 ? "" : "s"} defined between steps.
          {(() => {
            const cur = guide.steps.find((x) => x.phase === "current");
            if (!cur) return null;
            const names = guide.transitions
              .filter((t) => t.fromStepId === cur.id)
              .map((t) => {
                const to = stepById.get(t.toStepId);
                return `${t.name}→${to?.name ?? "?"}`;
              });
            return names.length ? (
              <span className="block mt-1 text-slate-600">
                From <strong>{cur.name}</strong>: {names.join(" · ")}
              </span>
            ) : null;
          })()}
        </p>
      ) : null}
    </div>
  );
}
