import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, isAbortError } from "@/lib/api";
import { type DashboardReportsResponse } from "@/lib/dashboardApi";
import { useTenantApi } from "@/lib/tenantApi";
import ForbiddenView from "@/components/ForbiddenView";

export default function ReportsPage() {
  const { t } = useTranslation();
  const { tenantId, get } = useTenantApi();
  const [report, setReport] = useState<DashboardReportsResponse | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ok" | "error" | "forbidden">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantId) {
      setLoadState("error");
      setErrorMessage(t("reports.noTenant"));
      return;
    }
    const ac = new AbortController();
    (async () => {
      setLoadState("loading");
      try {
        const data = (await get("/api/v1/dashboard/reports", {}, { signal: ac.signal })) as DashboardReportsResponse;
        if (!ac.signal.aborted) {
          setReport(data);
          setLoadState("ok");
        }
      } catch (e) {
        if (ac.signal.aborted || isAbortError(e)) return;
        if (e instanceof ApiError && e.status === 403) {
          setLoadState("forbidden");
          setErrorMessage(e.message);
          return;
        }
        setErrorMessage(e instanceof ApiError ? e.message : t("reports.loadFailed"));
        setLoadState("error");
      }
    })();
    return () => ac.abort();
  }, [tenantId, get, t]);

  if (loadState === "forbidden") {
    return (
      <ForbiddenView
        resourceKey="reports.forbiddenResource"
        detail={errorMessage ?? t("reports.forbiddenDetail")}
      />
    );
  }

  const c = report?.cases;
  const r = report?.referrals;
  const w = report?.workflows;

  return (
    <div className="p-gutter max-w-7xl mx-auto w-full pb-10">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-slate-500 font-label-caps text-xs mb-2">
          <span>{t("portal.breadcrumb.portal")}</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">{t("portal.breadcrumb.reports")}</span>
        </div>
        <h1 className="font-h1 text-primary">{t("reports.title")}</h1>
        <p className="font-body-md text-slate-600 mt-1">
          {t("reports.subtitle")}
          {report?.generatedAt && (
            <span className="block text-xs text-slate-400 mt-1">
              {t("reports.generatedAt", { date: new Date(report.generatedAt).toLocaleString() })}
            </span>
          )}
        </p>
      </header>

      {loadState === "loading" && (
        <div className="p-12 text-center text-slate-500">
          <span className="material-symbols-outlined animate-spin text-3xl">sync</span>
        </div>
      )}

      {loadState === "error" && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">{errorMessage}</div>
      )}

      {loadState === "ok" && report && (
        <div className="space-y-8">
          <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <MetricCard title={t("reports.metric.cases")} icon="folder_managed" rows={[
              [t("reports.metric.total"), c?.total],
              [t("reports.metric.open"), c?.open],
              [t("reports.metric.closed"), c?.closed],
              [t("reports.metric.inCustody"), c?.inCustody],
            ]} />
            <MetricCard title={t("reports.metric.referrals")} icon="move_to_inbox" rows={[
              [t("reports.metric.total"), r?.total],
              [t("reports.metric.incoming"), r?.incoming],
              [t("reports.metric.outgoing"), r?.outgoing],
              [t("reports.metric.pendingIncoming"), r?.pendingIncoming],
            ]} />
            <MetricCard title={t("reports.metric.workflows")} icon="account_tree" rows={[
              [t("reports.metric.definitions"), w?.total],
              [t("reports.metric.published"), w?.byStatus?.PUBLISHED],
              [t("reports.metric.draft"), w?.byStatus?.DRAFT],
            ]} />
          </section>

          <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <BreakdownCard title={t("reports.breakdown.byPriority")} data={c?.byPriority ?? {}} />
            <BreakdownCard title={t("reports.breakdown.byStatus")} data={c?.byStatus ?? {}} />
            <BreakdownCard title={t("reports.breakdown.referralsByStatus")} data={r?.byStatus ?? {}} />
            <BreakdownCard title={t("reports.breakdown.workflowsByStatus")} data={w?.byStatus ?? {}} />
          </section>

          <section className="bg-white border border-slate-200 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h2 className="font-h3 text-teal-900">{t("reports.partnerLoad.title")}</h2>
              <p className="text-sm text-slate-500">{t("reports.partnerLoad.subtitle")}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-primary text-white text-[10px] font-label-caps tracking-wider">
                    <th className="px-4 py-3">{t("reports.partnerLoad.agency")}</th>
                    <th className="px-4 py-3 text-center">{t("reports.partnerLoad.incoming")}</th>
                    <th className="px-4 py-3 text-center">{t("reports.partnerLoad.outgoing")}</th>
                    <th className="px-4 py-3 text-center">{t("reports.partnerLoad.pending")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(report.partners ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">
                        {t("reports.partnerLoad.empty")}
                      </td>
                    </tr>
                  ) : (
                    report.partners!.map((p) => (
                      <tr key={p.code} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <span className="font-bold text-teal-900">{p.name}</span>
                          <span className="block text-xs text-slate-500 font-mono">{p.code}</span>
                        </td>
                        <td className="px-4 py-3 text-center font-mono">{p.incoming}</td>
                        <td className="px-4 py-3 text-center font-mono">{p.outgoing}</td>
                        <td className="px-4 py-3 text-center">
                          {p.pending > 0 ? (
                            <span className="text-amber-800 font-bold">{p.pending}</span>
                          ) : (
                            "0"
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="bg-white border border-slate-200 rounded-xl p-6">
            <h2 className="font-h3 text-teal-900 mb-1">{t("reports.activity.title")}</h2>
            <p className="text-sm text-slate-500 mb-4">
              {t("reports.activity.count", { count: report.activity?.transitionsLast30Days ?? 0 })}
            </p>
            <ul className="space-y-3">
              {(report.activity?.recent ?? []).length === 0 ? (
                <li className="text-slate-500 text-sm">{t("reports.activity.empty")}</li>
              ) : (
                report.activity!.recent!.map((a) => (
                  <li key={a.id} className="text-sm border-b border-slate-100 pb-2 last:border-0">
                    <span className="font-semibold text-slate-800">
                      {a.transitionName ?? t("reports.activity.stepChange")}
                    </span>
                    {a.caseNumber && (
                      <Link
                        to={`/cases/${encodeURIComponent(a.caseId)}`}
                        className="text-primary font-mono text-xs ml-2 hover:underline"
                      >
                        {a.caseNumber}
                      </Link>
                    )}
                    <p className="text-xs text-slate-500 mt-0.5">
                      {a.actorLabel ?? t("reports.activity.system")} · {new Date(a.transitionedAt).toLocaleString()}
                    </p>
                  </li>
                ))
              )}
            </ul>
            <Link
              to="/audit"
              className="inline-block mt-4 text-xs font-bold text-primary uppercase tracking-wider hover:underline"
            >
              {t("reports.fullAuditLog")}
            </Link>
          </section>
        </div>
      )}
    </div>
  );
}

function MetricCard({
  title,
  icon,
  rows,
}: {
  title: string;
  icon: string;
  rows: [string, number | undefined][];
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <span className="material-symbols-outlined text-teal-700">{icon}</span>
        <h3 className="font-h3 text-slate-800">{title}</h3>
      </div>
      <dl className="space-y-2">
        {rows.map(([label, val]) => (
          <div key={label} className="flex justify-between text-sm">
            <dt className="text-slate-600">{label}</dt>
            <dd className="font-bold text-teal-900">{val ?? "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function BreakdownCard({ title, data }: { title: string; data: Record<string, number> }) {
  const { t } = useTranslation();
  const entries = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...entries.map(([, v]) => v));
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5">
      <h3 className="font-h3 text-slate-800 mb-4">{title}</h3>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">{t("reports.breakdown.noData")}</p>
      ) : (
        <ul className="space-y-2">
          {entries.map(([key, count]) => (
            <li key={key}>
              <div className="flex justify-between text-xs mb-1">
                <span className="uppercase font-semibold text-slate-600">{key}</span>
                <span className="font-mono">{count}</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-teal-600 rounded-full"
                  style={{ width: `${Math.round((count / max) * 100)}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
