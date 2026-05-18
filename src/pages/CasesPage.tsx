import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useSession } from "@/context/SessionContext";
import CreateCaseModal from "@/components/CreateCaseModal";
import Can from "@/permissions/Can";
import ForbiddenView from "@/components/ForbiddenView";
import { ApiError, apiGet, isAbortError } from "@/lib/api";
import {
  type ApiCase,
  formatCaseUpdated,
  priorityDisplay,
  statusBadgeClass,
} from "@/lib/casesApi";

type CasesResponse = { cases?: ApiCase[] };

function Stat({
  label,
  value,
  sub,
  hint,
  hintIcon,
  hintClass,
  valueClass = "text-primary",
}: {
  label: string;
  value: string;
  sub?: string;
  hint?: string;
  hintIcon?: string;
  hintClass?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white p-lg border border-outline-variant rounded-xl flex flex-col gap-1">
      <span className="font-label-caps text-slate-500">{label}</span>
      <span className={`font-h2 ${valueClass}`}>{value}</span>
      {hint ? (
        <span className={`text-xs font-medium flex items-center gap-1 ${hintClass ?? "text-green-600"}`}>
          {hintIcon && <span className="material-symbols-outlined text-xs">{hintIcon}</span>}
          {hint}
        </span>
      ) : (
        <span className="text-xs text-slate-500 font-medium">{sub}</span>
      )}
    </div>
  );
}

export default function CasesPage() {
  const { user } = useSession();
  const tenantId = user?.tenant?.id ?? user?.tenantId;
  const [cases, setCases] = useState<ApiCase[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ok" | "error" | "forbidden">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [listVersion, setListVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const ac = new AbortController();
    (async () => {
      // #region agent log
      fetch("http://127.0.0.1:7377/ingest/6302afe2-f95e-483b-b849-884818589670", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "99907a" },
        body: JSON.stringify({
          sessionId: "99907a",
          runId: "post-session-normalize",
          hypothesisId: "H1",
          location: "CasesPage.tsx:fetch:start",
          message: "cases load tenant ids from session",
          data: {
            tenantFromNestedObject: Boolean(user?.tenant?.id),
            tenantFromFlat: Boolean(user?.tenantId),
            effectiveTenantIdPassedToEffect: tenantId ?? null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      if (!tenantId) {
        setLoadState("error");
        setErrorMessage("No tenant on session. Sign in again with a valid tenant code.");
        return;
      }
      setLoadState("loading");
      setErrorMessage(null);
      try {
        const q = new URLSearchParams({ tenantId });
        const data = (await apiGet(`/api/v1/cases?${q.toString()}`, {
          signal: ac.signal,
        })) as CasesResponse;
        const list = Array.isArray(data.cases) ? data.cases : [];
        if (!cancelled) {
          setCases(list);
          setLoadState("ok");
        }
        // #region agent log
        fetch("http://127.0.0.1:7377/ingest/6302afe2-f95e-483b-b849-884818589670", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "99907a" },
          body: JSON.stringify({
            sessionId: "99907a",
            runId: "post-session-normalize",
            hypothesisId: "VERIFY",
            location: "CasesPage.tsx:fetch:ok",
            message: "cases list loaded",
            data: { caseCount: list.length },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
      } catch (e) {
        if (cancelled || isAbortError(e)) return;
        // #region agent log
        fetch("http://127.0.0.1:7377/ingest/6302afe2-f95e-483b-b849-884818589670", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "99907a" },
          body: JSON.stringify({
            sessionId: "99907a",
            runId: "post-session-normalize",
            hypothesisId: e instanceof ApiError && e.status === 403 ? "H2" : "H3",
            location: "CasesPage.tsx:fetch:error",
            message: "cases API error",
            data: {
              isApiError: e instanceof ApiError,
              status: e instanceof ApiError ? e.status : null,
              name: e instanceof Error ? e.name : "unknown",
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        // #endregion
        if (e instanceof ApiError && e.status === 403) {
          setErrorMessage(e.message);
          setCases([]);
          setLoadState("forbidden");
          return;
        }
        const msg =
          e instanceof ApiError
            ? e.message
            : "Could not load cases. Is the API gateway and case-service running?";
        setErrorMessage(msg);
        setCases([]);
        setLoadState("error");
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [tenantId, listVersion]);

  const stats = useMemo(() => {
    const total = cases.length;
    const pending = cases.filter((c) => c.status.toLowerCase().includes("pending")).length;
    const active = cases.filter((c) => {
      const s = c.status.toLowerCase();
      return s.includes("open") || s.includes("active");
    }).length;
    const escalated = cases.filter((c) => c.status.toLowerCase().includes("escalat")).length;
    return { total, pending, active, escalated };
  }, [cases]);

  if (loadState === "forbidden") {
    return <ForbiddenView resource="the case list" detail={errorMessage ?? undefined} />;
  }

  return (
    <div className="p-gutter max-w-7xl mx-auto w-full pb-10">
      {tenantId && user?.id && (
        <CreateCaseModal
          open={createOpen}
          onClose={() => setCreateOpen(false)}
          tenantId={tenantId}
          userId={user.id}
          onCreated={() => setListVersion((v) => v + 1)}
        />
      )}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-slate-500 font-label-caps text-xs mb-2 flex-wrap">
          <span>PORTAL</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span>CASE MANAGEMENT</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">ALL CASES</span>
        </div>
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="font-h1 text-primary">Inter-Agency Case Listing</h1>
            <p className="font-body-md text-slate-600 mt-1">Review and manage cross-departmental enforcement actions.</p>
          </div>
          <Can permission="cases:create">
            <button
              type="button"
              disabled={!tenantId || !user?.id}
              onClick={() => setCreateOpen(true)}
              className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-primary-container transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">add</span>
              Create Case
            </button>
          </Can>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-8">
        <Stat label="TOTAL CASES" value={String(stats.total)} sub="In your tenant" />
        <Stat label="PENDING REVIEW" value={String(stats.pending)} sub="Status contains pending" valueClass="text-tertiary" />
        <Stat label="ACTIVE" value={String(stats.active)} sub="Open / active status" valueClass="text-teal-600" />
        <div className="bg-white p-lg border border-outline-variant rounded-xl flex flex-col gap-1">
          <span className="font-label-caps text-slate-500">ESCALATED</span>
          <span className="font-h2 text-error">{stats.escalated}</span>
          <span className="text-xs text-error font-medium flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">priority_high</span>
            From listing
          </span>
        </div>
      </div>

      {loadState === "loading" && (
        <div className="bg-white border border-outline-variant rounded-xl p-12 text-center text-slate-600">
          <span className="material-symbols-outlined text-3xl animate-pulse">progress_activity</span>
          <p className="mt-2 font-body-sm">Loading cases…</p>
        </div>
      )}

      {loadState === "error" && errorMessage && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-lg text-amber-900 mb-6">
          <p className="font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined">warning</span>
            Could not load cases
          </p>
          <p className="text-sm mt-2">{errorMessage}</p>
        </div>
      )}

      {loadState === "ok" && (
        <div className="bg-white border border-outline-variant rounded-xl overflow-hidden">
          <div className="p-lg border-b border-outline-variant bg-slate-50 flex flex-wrap gap-4 items-center justify-between">
            <p className="text-sm text-slate-600">
              Data from <span className="font-mono text-xs">GET /api/v1/cases?tenantId=…</span>
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[880px]">
              <thead className="bg-primary text-white">
                <tr>
                  {["CASE NUMBER", "SUBJECT", "AGENCY", "STATUS", "PRIORITY", "LAST UPDATED", "ACTIONS"].map((h) => (
                    <th
                      key={h}
                      className={`p-md font-label-caps tracking-widest text-xs ${h === "ACTIONS" ? "text-right" : ""}`}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {cases.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-lg text-center text-slate-500 font-body-sm">
                      No cases returned for this tenant. Seed the database or create cases via the API.
                    </td>
                  </tr>
                ) : (
                  cases.map((r, i) => {
                    const stClass = statusBadgeClass(r.status);
                    const pr = priorityDisplay(r.priority);
                    return (
                      <tr
                        key={r.id}
                        className={`${i % 2 === 1 ? "bg-surface-container-low " : ""}hover:bg-slate-50 transition-colors`}
                      >
                        <td className="p-md font-system-id text-slate-600">{r.caseNumber}</td>
                        <td className="p-md font-body-sm font-semibold text-slate-900">{r.title}</td>
                        <td className="p-md font-body-sm text-slate-700">{r.tenant?.name ?? "—"}</td>
                        <td className="p-md">
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${stClass}`}>
                            {r.status.toUpperCase()}
                          </span>
                        </td>
                        <td className="p-md">
                          <span className={`flex items-center gap-1.5 text-xs font-bold ${pr.textClass}`}>
                            <span className={`w-2 h-2 rounded-full ${pr.dot}`} />
                            {pr.label}
                          </span>
                        </td>
                        <td className="p-md font-body-sm text-slate-500">{formatCaseUpdated(r.updatedAt)}</td>
                        <td className="p-md text-right">
                          <Link
                            to={`/cases/${encodeURIComponent(r.id)}`}
                            className="text-primary hover:text-teal-700 font-semibold text-sm"
                          >
                            Details
                          </Link>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="p-lg border-t border-outline-variant bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-sm text-slate-500">
              Showing <span className="font-bold text-slate-700">{cases.length}</span> case{cases.length === 1 ? "" : "s"}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
