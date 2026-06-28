import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useIsAdmin, useSession } from "@/context/SessionContext";
import CreateCaseModal from "@/components/CreateCaseModal";
import Can from "@/permissions/Can";
import { useTenantApi } from "@/lib/tenantApi";
import type { ApiCase } from "@/lib/casesApi";
import {
  type DashboardTask,
  type DashboardReportsResponse,
  taskStripeClass,
  taskTypeLabel,
} from "@/lib/dashboardApi";
import { type AuditLogRow, auditActorLabel, formatAuditWhen } from "@/lib/auditApi";
import PlatformDashboardPage from "./PlatformDashboardPage";

function dashCount(value: number | null, loading: boolean): string {
  if (loading) return "…";
  if (value === null) return "—";
  return String(value);
}

export default function DashboardPage() {
  const { isSystemAdmin } = useIsAdmin();
  if (isSystemAdmin) return <PlatformDashboardPage />;
  return <OperationalDashboard />;
}

function OperationalDashboard() {
  const { t } = useTranslation();
  const { user } = useSession();
  const navigate = useNavigate();
  const greeting =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || t("dashboard.greetingFallback");
  const tenantId = user?.tenant?.id ?? user?.tenantId ?? "";
  const { get: getTenantScoped } = useTenantApi();
  const [createCaseOpen, setCreateCaseOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [caseCount, setCaseCount] = useState<number | null>(null);
  const [referralCount, setReferralCount] = useState<number | null>(null);
  const [workflowCount, setWorkflowCount] = useState<number | null>(null);
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [partners, setPartners] = useState<DashboardReportsResponse["partners"]>([]);
  const [auditFeed, setAuditFeed] = useState<AuditLogRow[]>([]);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      const opts = { signal: ac.signal };
      const results = { cases: null as number | null, ref: null as number | null, wf: null as number | null };
      try {
        const d = (await getTenantScoped("/api/v1/cases", {}, opts)) as { cases?: ApiCase[] };
        results.cases = Array.isArray(d.cases) ? d.cases.length : 0;
      } catch {
        results.cases = null;
      }
      try {
        const d = (await getTenantScoped("/api/v1/referrals", {}, opts)) as { referrals?: unknown[] };
        results.ref = Array.isArray(d.referrals) ? d.referrals.length : 0;
      } catch {
        results.ref = null;
      }
      try {
        const d = (await getTenantScoped("/api/v1/workflows", {}, opts)) as { workflows?: unknown[] };
        results.wf = Array.isArray(d.workflows) ? d.workflows.length : 0;
      } catch {
        results.wf = null;
      }
      try {
        const d = (await getTenantScoped("/api/v1/dashboard/tasks", {}, opts)) as { tasks?: DashboardTask[] };
        if (!ac.signal.aborted) setTasks(Array.isArray(d.tasks) ? d.tasks.slice(0, 6) : []);
      } catch {
        if (!ac.signal.aborted) setTasks([]);
      }
      try {
        const d = (await getTenantScoped("/api/v1/dashboard/reports", {}, opts)) as DashboardReportsResponse;
        if (!ac.signal.aborted) setPartners(d.partners ?? []);
      } catch {
        if (!ac.signal.aborted) setPartners([]);
      }
      try {
        const d = (await getTenantScoped("/api/v1/audit", { limit: "5" }, opts)) as { logs?: AuditLogRow[] };
        if (!ac.signal.aborted) setAuditFeed(Array.isArray(d.logs) ? d.logs : []);
      } catch {
        if (!ac.signal.aborted) setAuditFeed([]);
      }
      if (!ac.signal.aborted) {
        setCaseCount(results.cases);
        setReferralCount(results.ref);
        setWorkflowCount(results.wf);
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [getTenantScoped]);

  const urgentCount = tasks.filter((t) => t.isPastDue || t.priority === "urgent").length;

  return (
    <div className="p-gutter max-w-7xl mx-auto space-y-gutter pb-8">
      {tenantId && user?.id && (
        <CreateCaseModal
          open={createCaseOpen}
          onClose={() => setCreateCaseOpen(false)}
          tenantId={tenantId}
          userId={user.id}
          onCreated={(caseId) => navigate(`/cases/${encodeURIComponent(caseId)}`)}
        />
      )}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h2 className="font-h2 text-h2 text-primary leading-none">{t("dashboard.welcome", { name: greeting })}</h2>
          <p className="text-slate-500 mt-1">
            {user?.tenant?.name ? (
              t("dashboard.signedInUnderTenant", { name: user.tenant.name, code: user.tenant.code })
            ) : (
              t("dashboard.summaryFallback")
            )}
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Can permission="cases:create">
            <button
              type="button"
              disabled={!tenantId || !user?.id}
              onClick={() => setCreateCaseOpen(true)}
              className="px-4 py-2 bg-primary-container text-white rounded-md text-xs font-semibold hover:bg-teal-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-base">add</span>
              {t("dashboard.newCase")}
            </button>
          </Can>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-gutter">
        <div className="col-span-12 md:col-span-4 bg-white p-6 rounded-lg border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-teal-50 rounded-lg">
              <span className="material-symbols-outlined text-teal-700">folder_managed</span>
            </div>
            <Link to="/cases" className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full hover:underline">
              {t("dashboard.viewCases")}
            </Link>
          </div>
          <h3 className="text-slate-500 text-sm font-label-caps tracking-wider">{t("dashboard.casesLabel")}</h3>
          <p className="text-3xl font-bold text-teal-900 mt-1">{dashCount(caseCount, loading)}</p>
          <p className="mt-4 text-[10px] text-slate-400">{t("dashboard.casesHint")}</p>
        </div>

        <div className="col-span-12 md:col-span-4 bg-white p-6 rounded-lg border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-amber-50 rounded-lg">
              <span className="material-symbols-outlined text-amber-600">move_to_inbox</span>
            </div>
            <Link to="/referrals" className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full hover:underline">
              {t("dashboard.viewReferrals")}
            </Link>
          </div>
          <h3 className="text-slate-500 text-sm font-label-caps tracking-wider">{t("dashboard.referralsLabel")}</h3>
          <p className="text-3xl font-bold text-teal-900 mt-1">{dashCount(referralCount, loading)}</p>
          <p className="mt-4 text-[10px] text-slate-400">{t("dashboard.referralsHint")}</p>
        </div>

        <div className="col-span-12 md:col-span-4 bg-white p-6 rounded-lg border border-slate-200 shadow-sm transition-all hover:shadow-md">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-emerald-50 rounded-lg">
              <span className="material-symbols-outlined text-emerald-600">account_tree</span>
            </div>
            <Link to="/workflows" className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full hover:underline">
              {t("dashboard.viewWorkflows")}
            </Link>
          </div>
          <h3 className="text-slate-500 text-sm font-label-caps tracking-wider">{t("dashboard.workflowsLabel")}</h3>
          <p className="text-3xl font-bold text-teal-900 mt-1">{dashCount(workflowCount, loading)}</p>
          <p className="mt-4 text-[10px] text-slate-400">{t("dashboard.workflowsHint")}</p>
        </div>

        <Can permission="cases:read">
          <div className="col-span-12 lg:col-span-8 bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center gap-4 flex-wrap">
              <h3 className="font-h3 text-base text-teal-900 flex items-center gap-2">
                <span className="material-symbols-outlined">priority_high</span>
                {t("dashboard.urgentTasks")}
              </h3>
              <div className="flex items-center gap-2">
                {urgentCount > 0 && (
                  <span className="text-[10px] font-bold py-1 px-2 rounded-md bg-error text-white shrink-0">
                    {t("dashboard.urgentCount", { count: urgentCount })}
                  </span>
                )}
                <Link to="/tasks" className="text-[10px] font-bold text-primary hover:underline uppercase tracking-wide">
                  {t("dashboard.allTasks")}
                </Link>
              </div>
            </div>
            {loading ? (
              <p className="p-8 text-center text-slate-500 text-sm">{t("dashboard.loadingTasks")}</p>
            ) : tasks.length === 0 ? (
              <p className="p-8 text-center text-slate-500 text-sm">{t("dashboard.noOpenTasks")}</p>
            ) : (
              <div className="divide-y divide-slate-100">
                {tasks.map((task) => (
                  <DashboardTaskRow key={task.id} task={task} />
                ))}
              </div>
            )}
          </div>
        </Can>

        <div className="col-span-12 lg:col-span-4 bg-white rounded-lg border border-slate-200 p-6 flex flex-col h-full min-h-[320px]">
          <h3 className="font-label-caps text-xs tracking-widest text-slate-500 mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined text-sm">dynamic_feed</span>
            {t("dashboard.recentActivity")}
          </h3>
          {loading ? (
            <p className="text-sm text-slate-500">{t("common.loading")}</p>
          ) : auditFeed.length === 0 ? (
            <p className="text-sm text-slate-500">{t("dashboard.noAuditEntries")}</p>
          ) : (
            <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
              {auditFeed.map((log) => (
                <ActivityItem
                  key={log.id}
                  icon="history"
                  border="border-teal-600"
                  time={`${formatAuditWhen(log.createdAt)} · ${log.action}`}
                  text={`${log.entityType ?? t("dashboard.activityRecord")} ${auditActorLabel(log)}`}
                />
              ))}
            </div>
          )}
          <Link
            to="/audit"
            className="mt-auto pt-6 text-center text-[10px] font-bold text-primary border-t border-slate-100 mt-6 w-full uppercase tracking-wider hover:underline block"
          >
            {t("dashboard.viewAuditLog")}
          </Link>
        </div>

        <div className="col-span-12 bg-white rounded-lg border border-slate-200 overflow-hidden">
          <div className="p-6">
            <div className="flex justify-between items-start gap-4 flex-wrap mb-1">
              <h3 className="font-h3 text-lg text-teal-900">{t("dashboard.partnerAgencyLoad")}</h3>
              <Link to="/reports" className="text-xs font-bold text-primary hover:underline uppercase tracking-wide">
                {t("dashboard.fullReports")}
              </Link>
            </div>
            <p className="text-sm text-slate-500 mb-6">{t("dashboard.partnerLoadHint")}</p>
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-primary-container text-white">
                    <th className="px-4 py-3 font-label-caps text-[10px] tracking-wider rounded-tl-lg">{t("dashboard.table.agency")}</th>
                    <th className="px-4 py-3 font-label-caps text-[10px] tracking-wider text-center">{t("dashboard.table.incoming")}</th>
                    <th className="px-4 py-3 font-label-caps text-[10px] tracking-wider text-center">{t("dashboard.table.outgoing")}</th>
                    <th className="px-4 py-3 font-label-caps text-[10px] tracking-wider text-center rounded-tr-lg">{t("dashboard.table.pending")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">
                        {t("common.loading")}
                      </td>
                    </tr>
                  ) : (partners ?? []).length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-slate-500">
                        {t("dashboard.noPartnerReferrals")}
                      </td>
                    </tr>
                  ) : (
                    partners!.map((p) => (
                      <tr key={p.code} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-4 text-sm font-bold text-teal-900">
                          {p.name}
                          <span className="block text-xs font-mono text-slate-500 font-normal">{p.code}</span>
                        </td>
                        <td className="px-4 py-4 text-sm font-system-id text-center">{p.incoming}</td>
                        <td className="px-4 py-4 text-sm text-center">{p.outgoing}</td>
                        <td className="px-4 py-4 text-center">
                          {p.pending > 0 ? (
                            <span className="inline-block px-2 py-1 rounded bg-amber-50 text-amber-700 text-[10px] font-bold">
                              {p.pending}
                            </span>
                          ) : (
                            <span className="text-slate-500">0</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function DashboardTaskRow({ task }: { task: DashboardTask }) {
  const { t } = useTranslation();
  const meta: string[] = [];
  if (task.caseNumber) meta.push(task.caseNumber);
  if (task.dueAt && task.isPastDue) meta.push(t("dashboard.pastDeadline"));

  return (
    <div className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4">
      <div className={`w-2 h-12 ${taskStripeClass(task)} rounded-full shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-bold uppercase text-slate-500">{taskTypeLabel(task.type)}</span>
          <h4 className="text-sm font-bold text-on-surface">{task.title}</h4>
        </div>
        {task.caseTitle && <p className="text-xs text-slate-600 mt-0.5">{task.caseTitle}</p>}
        <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
        {meta.length > 0 && (
          <div className="flex gap-4 mt-2 flex-wrap">
            {meta.map((m) => (
              <span key={m} className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
                <span className="material-symbols-outlined text-xs">schedule</span>
                {m}
              </span>
            ))}
          </div>
        )}
      </div>
      <Link
        to={task.href}
        className="px-3 py-1.5 border border-slate-200 rounded text-[10px] font-bold text-primary hover:bg-slate-100 shrink-0"
      >
        {task.actionLabel}
      </Link>
    </div>
  );
}

function ActivityItem({
  icon,
  border,
  iconCls = "text-teal-600",
  time,
  text,
}: {
  icon: string;
  border: string;
  iconCls?: string;
  time: string;
  text: string;
}) {
  return (
    <div className="relative pl-8">
      <div
        className={`absolute left-0 top-0.5 w-6 h-6 rounded-full bg-white border-2 ${border} flex items-center justify-center z-10`}
      >
        <span className={`material-symbols-outlined text-[12px] ${iconCls}`}>{icon}</span>
      </div>
      <p className="text-[10px] font-system-id text-slate-400">{time}</p>
      <p className="text-sm font-semibold text-teal-900 mt-1 leading-snug">{text}</p>
    </div>
  );
}
