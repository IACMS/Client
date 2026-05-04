type Step = { id: string; name: string; isInitial: boolean; isFinal: boolean };
type Transition = { fromStepId: string; toStepId: string };

export type PublishValidationResult = { blocking: string[]; warnings: string[] };

/** Client-side checks aligned with workflow spec before calling publish. */
export function validateWorkflowForPublish(steps: Step[], transitions: Transition[]): PublishValidationResult {
  const blocking: string[] = [];
  const warnings: string[] = [];

  if (steps.length === 0) {
    blocking.push("Add at least one step before publishing.");
    return { blocking, warnings };
  }

  const inits = steps.filter((s) => s.isInitial);
  const fins = steps.filter((s) => s.isFinal);

  if (inits.length !== 1) {
    blocking.push(`There must be exactly one initial step (found ${inits.length}).`);
  }
  if (fins.length < 1) {
    blocking.push("Add at least one final (terminal) step.");
  }

  const init = inits[0];
  if (!init) {
    return { blocking, warnings };
  }

  const adj = new Map<string, string[]>();
  for (const s of steps) adj.set(s.id, []);
  for (const t of transitions) {
    const list = adj.get(t.fromStepId);
    if (list) list.push(t.toStepId);
  }

  const seen = new Set<string>();
  const stack = [init.id];
  while (stack.length) {
    const u = stack.pop()!;
    if (seen.has(u)) continue;
    seen.add(u);
    for (const v of adj.get(u) ?? []) stack.push(v);
  }

  for (const s of steps) {
    if (!seen.has(s.id)) {
      warnings.push(`Step “${s.name}” is not reachable from the initial step.`);
    }
  }

  const finIds = new Set(fins.map((f) => f.id));
  const q: string[] = [init.id];
  const seen2 = new Set<string>();
  let canReachFinal = false;
  while (q.length) {
    const u = q.shift()!;
    if (seen2.has(u)) continue;
    seen2.add(u);
    if (finIds.has(u)) {
      canReachFinal = true;
      break;
    }
    for (const v of adj.get(u) ?? []) q.push(v);
  }

  if (fins.length > 0 && !canReachFinal) {
    warnings.push("No path exists from the initial step to any final step.");
  }

  return { blocking, warnings };
}
