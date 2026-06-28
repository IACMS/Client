import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, isAbortError } from "@/lib/api";
import {
  type DashboardTask,
  type DashboardTasksResponse,
  taskStripeClass,
  taskTypeLabel,
} from "@/lib/dashboardApi";
import { useTenantApi } from "@/lib/tenantApi";
import ForbiddenView from "@/components/ForbiddenView";

export default function TasksPage() {
  const { t } = useTranslation();
  const { tenantId, get } = useTenantApi();
  const [tasks, setTasks] = useState<DashboardTask[]>([]);
  const [summary, setSummary] = useState<DashboardTasksResponse["summary"] | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ok" | "error" | "forbidden">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "referral" | "workflow" | "urgent">("all");

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!tenantId) return;
      setLoadState("loading");
      setErrorMessage(null);
      try {
        const data = (await get("/api/v1/dashboard/tasks", {}, { signal })) as DashboardTasksResponse;
        if (signal?.aborted) return;
        setTasks(Array.isArray(data.tasks) ? data.tasks : []);
        setSummary(data.summary ?? null);
        setLoadState("ok");
      } catch (e) {
        if (signal?.aborted || isAbortError(e)) return;
        if (e instanceof ApiError && e.status === 403) {
          setLoadState("forbidden");
          setErrorMessage(e.message);
          return;
        }
        setErrorMessage(
          e instanceof ApiError ? e.message : t("tasks.loadFailed"),
        );
        setLoadState("error");
      }
    },
    [tenantId, get, t],
  );

  useEffect(() => {
    if (!tenantId) {
      setLoadState("error");
      setErrorMessage(t("tasks.noTenant"));
      return;
    }
    const ac = new AbortController();
    void load(ac.signal);
    return () => ac.abort();
  }, [tenantId, load, t]);

  const filtered = tasks.filter((task) => {
    if (filter === "all") return true;
    if (filter === "referral") return task.type === "referral_pending";
    if (filter === "workflow")
      return task.type === "transition" || task.type === "transition_overdue" || task.type === "attachment_required";
    return task.isPastDue || task.priority === "urgent" || task.priority === "high";
  });

  const urgentCount = tasks.filter((task) => task.isPastDue || task.priority === "urgent").length;

  if (loadState === "forbidden") {
    return (
      <ForbiddenView
        resourceKey="tasks.forbiddenResource"
        detail={errorMessage ?? t("tasks.forbiddenDetail")}
      />
    );
  }

  return (
    <div className="p-gutter max-w-7xl mx-auto w-full pb-10">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-slate-500 font-label-caps text-xs mb-2">
          <span>{t("portal.breadcrumb.portal")}</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">{t("portal.breadcrumb.tasks")}</span>
        </div>
        <h1 className="font-h1 text-primary">{t("tasks.title")}</h1>
        <p className="font-body-md text-slate-600 mt-1">{t("tasks.subtitle")}</p>
      </header>

      {loadState === "ok" && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Stat label={t("tasks.stats.total")} value={String(summary.total)} />
          <Stat label={t("tasks.stats.referrals")} value={String(summary.referrals)} />
          <Stat label={t("tasks.stats.workflowActions")} value={String(summary.transitions)} />
          <Stat label={t("tasks.stats.attachmentsDue")} value={String(summary.attachments)} />
        </div>
      )}

      {loadState === "ok" && (
        <div className="flex flex-wrap gap-2 mb-4">
          {(
            [
              ["all", t("tasks.filter.all")],
              ["urgent", t("tasks.filter.urgent", { count: urgentCount })],
              ["referral", t("tasks.filter.referrals")],
              ["workflow", t("tasks.filter.workflow")],
            ] as const
          ).map(([f, label]) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${
                filter === f
                  ? "bg-primary text-white border-primary"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      )}

      {loadState === "loading" && (
        <div className="p-12 text-center text-slate-500">
          <span className="material-symbols-outlined animate-spin text-3xl">sync</span>
        </div>
      )}

      {loadState === "error" && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">{errorMessage}</div>
      )}

      {loadState === "ok" && (
        <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <p className="p-12 text-center text-slate-500">{t("tasks.empty")}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {filtered.map((task) => (
                <li key={task.id}>
                  <TaskRow task={task} />
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-4">
      <p className="text-xs font-label-caps text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-teal-900 mt-1">{value}</p>
    </div>
  );
}

function TaskRow({ task }: { task: DashboardTask }) {
  const { t } = useTranslation();
  const meta: string[] = [];
  if (task.caseNumber) meta.push(task.caseNumber);
  if (task.partnerCode) meta.push(t("tasks.fromPartner", { code: task.partnerCode }));
  if (task.dueAt) {
    meta.push(
      task.isPastDue
        ? t("tasks.pastDeadline")
        : t("tasks.dueAt", { date: new Date(task.dueAt).toLocaleString() }),
    );
  }

  return (
    <div className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4">
      <div className={`w-2 h-12 ${taskStripeClass(task)} rounded-full shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
            {taskTypeLabel(task.type)}
          </span>
          <h4 className="text-sm font-bold text-slate-900">{task.title}</h4>
        </div>
        {task.caseTitle && <p className="text-xs text-slate-600 mt-0.5 font-medium">{task.caseTitle}</p>}
        <p className="text-xs text-slate-500 mt-0.5">{task.description}</p>
        {meta.length > 0 && (
          <div className="flex gap-3 mt-2 flex-wrap">
            {meta.map((m) => (
              <span key={m} className="text-[10px] text-slate-500 flex items-center gap-1">
                <span className="material-symbols-outlined text-xs">label</span>
                {m}
              </span>
            ))}
          </div>
        )}
      </div>
      <Link
        to={task.href}
        className={`px-3 py-1.5 border rounded text-[10px] font-bold shrink-0 ${
          task.blocked
            ? "border-slate-200 text-slate-400 pointer-events-none"
            : "border-slate-200 text-primary hover:bg-slate-100"
        }`}
      >
        {task.actionLabel}
      </Link>
    </div>
  );
}
