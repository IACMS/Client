import { useCallback, useEffect, useState } from "react";
import { ApiError, apiGet, isAbortError } from "@/lib/api";

export type WorkflowStep = {
  id: string;
  key: string;
  name: string;
  description?: string | null;
  isInitial: boolean;
  isFinal: boolean;
  requiresAttachment?: boolean;
  position: number;
  allowedRoleIds?: string[];
};

export type WorkflowTransitionTimeLimitType = "NONE" | "RECOMMENDATION" | "DEADLINE";

export type WorkflowTransitionTimeLimitUnit = "HOURS" | "DAYS";

export type WorkflowTransition = {
  id: string;
  fromStepId: string;
  toStepId: string;
  name: string;
  description?: string | null;
  requiresComment: boolean;
  allowedRoleIds?: string[];
  timeLimitType?: WorkflowTransitionTimeLimitType | string;
  timeLimitAmount?: number | null;
  timeLimitUnit?: WorkflowTransitionTimeLimitUnit | string | null;
};

export type ApiWorkflow = {
  id: string;
  tenantId?: string;
  name: string;
  status: string;
  version?: number;
  steps: WorkflowStep[];
  transitions: WorkflowTransition[];
};

export type WorkflowLoadState = "loading" | "ok" | "error" | "forbidden";

export type UseWorkflowResult = {
  workflow: ApiWorkflow | null;
  loadState: WorkflowLoadState;
  loadError: string | null;
  reload: () => Promise<void>;
};

/**
 * Loads a single workflow definition (via `/workflows/:id/full`) and exposes
 * a `reload` function for mutate-then-refresh flows. Splits load state from
 * the designer page so it can focus on rendering.
 */
export function useWorkflow(id: string | undefined): UseWorkflowResult {
  const [workflow, setWorkflow] = useState<ApiWorkflow | null>(null);
  const [loadState, setLoadState] = useState<WorkflowLoadState>("loading");
  const [loadError, setLoadError] = useState<string | null>(null);

  const reload = useCallback(
    async (signal?: AbortSignal) => {
      if (!id) return;
      setLoadError(null);
      try {
        const data = (await apiGet(`/api/v1/workflows/${encodeURIComponent(id)}/full`, { signal })) as
          | ApiWorkflow
          | { workflow?: ApiWorkflow };
        if (signal?.aborted) return;
        const wf =
          data && typeof data === "object" && "workflow" in data && data.workflow
            ? data.workflow
            : (data as ApiWorkflow);
        if (!wf?.id || !Array.isArray(wf.steps) || !Array.isArray(wf.transitions)) {
          setLoadError("Invalid response from server (missing workflow steps).");
          setWorkflow(null);
          setLoadState("error");
          return;
        }
        setWorkflow({ ...wf, steps: wf.steps, transitions: wf.transitions });
        setLoadState("ok");
      } catch (e) {
        if (isAbortError(e)) return;
        setWorkflow(null);
        if (e instanceof ApiError && e.status === 403) {
          setLoadError(e.message);
          setLoadState("forbidden");
          return;
        }
        setLoadState("error");
        setLoadError(
          e instanceof ApiError
            ? e.message
            : e instanceof Error
              ? e.message
              : "Request failed. Check that the API is running and you are signed in.",
        );
      }
    },
    [id],
  );

  useEffect(() => {
    const ac = new AbortController();
    void reload(ac.signal);
    return () => ac.abort();
  }, [reload]);

  return { workflow, loadState, loadError, reload };
}
