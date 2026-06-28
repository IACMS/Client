import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import CreateCaseModal from "@/components/CreateCaseModal";
import Can from "@/permissions/Can";
import ForbiddenView from "@/components/ForbiddenView";
import { ApiError, apiGet, isAbortError, isSchemaMismatchError, schemaMismatchHint } from "@/lib/api";
import {
  type ApiCase,
  formatCaseUpdated,
  isIncomingPendingReferral,
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
  const { t } = useTranslation();
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
      if (!tenantId) {
        setLoadState("error");
        setErrorMessage(t("cases.noTenant"));
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
      } catch (e) {
        if (cancelled || isAbortError(e)) return;
        if (e instanceof ApiError && e.status === 403) {
          setErrorMessage(e.message);
          setCases([]);
          setLoadState("forbidden");
          return;
        }
        const msg =
          e instanceof ApiError
            ? isSchemaMismatchError(e.body)
              ? schemaMismatchHint()
              : e.message
            : t("cases.loadFailedGeneric");
        setErrorMessage(msg);
        setCases([]);
        setLoadState("error");
      }
    })();
    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [tenantId, listVersion, t]);

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
    return <ForbiddenView resourceKey="cases.forbiddenResource" detail={errorMessage ?? undefined} />;
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
          <span>{t("portal.breadcrumb.portal")}</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span>{t("portal.breadcrumb.caseManagement")}</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">{t("portal.breadcrumb.allCases")}</span>
        </div>
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="font-h1 text-primary">{t("cases.title")}</h1>
            <p className="font-body-md text-slate-600 mt-1">{t("cases.subtitle")}</p>
          </div>
          <Can permission="cases:create">
            <button
              type="button"
              disabled={!tenantId || !user?.id}
              onClick={() => setCreateOpen(true)}
              className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-primary-container transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined">add</span>
              {t("cases.createCase")}
            </button>
          </Can>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-8">
        <Stat label={t("cases.stats.total")} value={String(stats.total)} sub={t("cases.stats.totalHint")} />
        <Stat label={t("cases.stats.pending")} value={String(stats.pending)} sub={t("cases.stats.pendingHint")} valueClass="text-tertiary" />
        <Stat label={t("cases.stats.active")} value={String(stats.active)} sub={t("cases.stats.activeHint")} valueClass="text-teal-600" />
        <div className="bg-white p-lg border border-outline-variant rounded-xl flex flex-col gap-1">
          <span className="font-label-caps text-slate-500">{t("cases.stats.escalated")}</span>
          <span className="font-h2 text-error">{stats.escalated}</span>
          <span className="text-xs text-error font-medium flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">priority_high</span>
            {t("cases.stats.escalatedHint")}
          </span>
        </div>
      </div>

      {loadState === "loading" && (
        <div className="bg-white border border-outline-variant rounded-xl p-12 text-center text-slate-600">
          <span className="material-symbols-outlined text-3xl animate-pulse">progress_activity</span>
          <p className="mt-2 font-body-sm">{t("cases.loading")}</p>
        </div>
      )}

      {loadState === "error" && errorMessage && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-lg text-amber-900 mb-6">
          <p className="font-semibold flex items-center gap-2">
            <span className="material-symbols-outlined">warning</span>
            {t("cases.loadFailedTitle")}
          </p>
          <p className="text-sm mt-2">{errorMessage}</p>
        </div>
      )}

      {loadState === "ok" && (
        <div className="bg-white border border-outline-variant rounded-xl overflow-hidden">
          <div className="p-lg border-b border-outline-variant bg-slate-50 flex flex-wrap gap-4 items-center justify-between">
            <p className="text-sm text-slate-600">
              {t("cases.dataSource")}
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[880px]">
              <thead className="bg-primary text-white">
                <tr>
                  {[
                    t("cases.table.caseNumber"),
                    t("cases.table.subject"),
                    t("cases.table.agency"),
                    t("cases.table.status"),
                    t("cases.table.priority"),
                    t("cases.table.lastUpdated"),
                    t("cases.table.actions"),
                  ].map((h) => (
                    <th
                      key={h}
                      className={`p-md font-label-caps tracking-widest text-xs ${h === t("cases.table.actions") ? "text-right" : ""}`}
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
                      {t("cases.empty")}
                    </td>
                  </tr>
                ) : (
                  cases.map((r, i) => {
                    const stClass = statusBadgeClass(r.status);
                    const pr = priorityDisplay(r.priority);
                    const incomingReferral = isIncomingPendingReferral(r, tenantId ?? undefined);
                    return (
                      <tr
                        key={r.id}
                        className={`${i % 2 === 1 ? "bg-surface-container-low " : ""}hover:bg-slate-50 transition-colors`}
                      >
                        <td className="p-md font-system-id text-slate-600">
                          {r.caseNumber}
                          {incomingReferral && (
                            <span className="block mt-1 text-[10px] font-bold uppercase text-teal-800 bg-teal-50 border border-teal-200 rounded px-1.5 py-0.5 w-fit">
                              {t("cases.incomingReferralBadge")}
                            </span>
                          )}
                        </td>
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
                            {t("cases.details")}
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
              {t("cases.showingCount", { count: cases.length })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
