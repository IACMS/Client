import { useCallback } from "react";
import { useSession } from "@/context/SessionContext";
import { apiGet, type ApiCallOptions } from "./api";

/**
 * Tenant-scoped GET helper. Automatically appends `tenantId` to the query
 * string so multi-tenant endpoints stay isolated even when the caller forgets
 * to pass it. Falls back to a plain request if no tenant is on the session.
 *
 * `get` is memoized on `tenantId` so it's safe to use as a dependency in
 * `useEffect`.
 */
export function useTenantApi() {
  const { user } = useSession();
  const tenantId = user?.tenant?.id ?? user?.tenantId ?? null;

  const get = useCallback(
    (
      path: string,
      params: Record<string, string> = {},
      opts: ApiCallOptions = {},
    ): Promise<unknown> => {
      const [base, existingQuery] = path.split("?");
      const search = new URLSearchParams(existingQuery ?? "");
      if (tenantId) search.set("tenantId", tenantId);
      for (const [k, v] of Object.entries(params)) search.set(k, v);
      const finalPath = search.toString() ? `${base}?${search.toString()}` : base;
      return apiGet(finalPath, opts);
    },
    [tenantId],
  );

  return { tenantId, get };
}
