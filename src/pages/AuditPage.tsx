import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, isAbortError } from "@/lib/api";
import { useTenantApi } from "@/lib/tenantApi";
import ForbiddenView from "@/components/ForbiddenView";
import AuditLogDetailModal from "@/components/AuditLogDetailModal";
import {
  AUTH_EXCLUDED_ACTIONS,
  type AuditFilters,
  type AuditListResponse,
  type AuditLogRow,
  auditActorLabel,
  auditDatePresets,
  buildAuditQueryParams,
  formatAuditWhen,
} from "@/lib/auditApi";

const PAGE_SIZE = 50;

const ENTITY_TYPES = [
  "case",
  "referral",
  "tenant",
  "assignment",
  "case_referral",
  "user",
  "workflow",
];

const PRESET_KEYS = ["audit.preset.last7", "audit.preset.last30", "audit.preset.last90"] as const;

const DEFAULT_FILTERS: AuditFilters = {
  search: "",
  action: "",
  entityType: "",
  entityId: "",
  startDate: "",
  endDate: "",
  sortBy: "createdAt",
  sortDir: "desc",
  limit: PAGE_SIZE,
  offset: 0,
  excludeActions: AUTH_EXCLUDED_ACTIONS,
};

export default function AuditPage() {
  const { t } = useTranslation();
  const { tenantId, get } = useTenantApi();
  const [filters, setFilters] = useState<AuditFilters>(DEFAULT_FILTERS);
  const [applied, setApplied] = useState<AuditFilters>(DEFAULT_FILTERS);
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loadState, setLoadState] = useState<
    "loading" | "ok" | "error" | "forbidden"
  >("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditLogRow | null>(null);

  const page = Math.floor((applied.offset ?? 0) / PAGE_SIZE);
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const loadLogs = useCallback(
    async (active: AuditFilters, signal?: AbortSignal) => {
      if (!tenantId) return;
      setLoadState("loading");
      setErrorMessage(null);
      try {
        const params = buildAuditQueryParams(active);
        const data = (await get("/api/v1/audit", params, {
          signal,
        })) as AuditListResponse;
        if (signal?.aborted) return;
        setLogs(Array.isArray(data.logs) ? data.logs : []);
        setTotal(
          typeof data.total === "number"
            ? data.total
            : (data.logs?.length ?? 0),
        );
        setLoadState("ok");
      } catch (e) {
        if (signal?.aborted || isAbortError(e)) return;
        if (e instanceof ApiError && e.status === 403) {
          setLoadState("forbidden");
          setErrorMessage(e.message);
          return;
        }
        setErrorMessage(
          e instanceof ApiError
            ? e.message
            : t("audit.loadFailed"),
        );
        setLoadState("error");
      }
    },
    [tenantId, get, t],
  );

  useEffect(() => {
    if (!tenantId) {
      setLoadState("error");
      setErrorMessage(t("audit.noTenant"));
      return;
    }
    const ac = new AbortController();
    void loadLogs(applied, ac.signal);
    return () => ac.abort();
  }, [tenantId, applied, loadLogs, t]);

  const presets = useMemo(() => auditDatePresets(), []);

  function patchFilters(patch: Partial<AuditFilters>) {
    setFilters((prev) => ({ ...prev, ...patch, offset: patch.offset ?? 0 }));
  }

  function applyFilters() {
    setApplied({ ...filters, offset: 0 });
  }

  function clearFilters() {
    setFilters(DEFAULT_FILTERS);
    setApplied(DEFAULT_FILTERS);
  }

  function goToPage(nextPage: number) {
    const offset = Math.max(0, nextPage) * PAGE_SIZE;
    const next = { ...applied, offset };
    setFilters((f) => ({ ...f, offset }));
    setApplied(next);
  }

  function toggleSort(column: AuditFilters["sortBy"]) {
    if (!column) return;
    const nextDir: "asc" | "desc" =
      applied.sortBy === column && applied.sortDir === "desc" ? "asc" : "desc";
    const next = { ...applied, sortBy: column, sortDir: nextDir, offset: 0 };
    setFilters((f) => ({ ...f, sortBy: column, sortDir: nextDir, offset: 0 }));
    setApplied(next);
  }

  function sortIndicator(column: AuditFilters["sortBy"]) {
    if (applied.sortBy !== column) return null;
    return applied.sortDir === "asc" ? " ↑" : " ↓";
  }

  if (loadState === "forbidden") {
    return (
      <ForbiddenView
        resourceKey="audit.forbiddenResource"
        detail={errorMessage ?? t("audit.forbiddenDetail")}
      />
    );
  }

  return (
    <div className="p-gutter max-w-7xl mx-auto w-full pb-10">
      <AuditLogDetailModal
        logId={selected?.id ?? null}
        preview={selected}
        onClose={() => setSelected(null)}
      />

      <header className="mb-6">
        <div className="flex items-center gap-2 text-slate-500 font-label-caps text-xs mb-2">
          <span>{t("portal.breadcrumb.portal")}</span>
          <span className="material-symbols-outlined text-xs">
            chevron_right
          </span>
          <span className="text-primary font-bold">{t("portal.breadcrumb.audit")}</span>
        </div>
        <h1 className="font-h1 text-primary">{t("audit.title")}</h1>
        <p className="font-body-md text-slate-600 mt-1">{t("audit.subtitle")}</p>
      </header>

      <div className="bg-white border border-outline-variant rounded-xl shadow-sm p-4 mb-4 space-y-4">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px]">
            <label
              className="block text-[10px] font-label-caps text-slate-500 mb-1"
              htmlFor="audit-search"
            >
              {t("audit.search.label")}
            </label>
            <input
              id="audit-search"
              type="search"
              placeholder={t("audit.search.placeholder")}
              value={filters.search ?? ""}
              onChange={(e) => patchFilters({ search: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="min-w-[140px]">
            <label
              className="block text-[10px] font-label-caps text-slate-500 mb-1"
              htmlFor="audit-action"
            >
              {t("audit.action.label")}
            </label>
            <input
              id="audit-action"
              type="text"
              placeholder={t("audit.action.placeholder")}
              value={filters.action ?? ""}
              onChange={(e) => patchFilters({ action: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="min-w-[120px]">
            <label
              className="block text-[10px] font-label-caps text-slate-500 mb-1"
              htmlFor="audit-etype"
            >
              {t("audit.entityType.label")}
            </label>
            <select
              id="audit-etype"
              value={filters.entityType ?? ""}
              onChange={(e) => patchFilters({ entityType: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">{t("audit.entityType.all")}</option>
              {ENTITY_TYPES.map((etype) => (
                <option key={etype} value={etype}>
                  {etype}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <label
              className="block text-[10px] font-label-caps text-slate-500 mb-1"
              htmlFor="audit-from"
            >
              {t("audit.fromDate")}
            </label>
            <input
              id="audit-from"
              type="date"
              value={filters.startDate ?? ""}
              onChange={(e) => patchFilters({ startDate: e.target.value })}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label
              className="block text-[10px] font-label-caps text-slate-500 mb-1"
              htmlFor="audit-to"
            >
              {t("audit.toDate")}
            </label>
            <input
              id="audit-to"
              type="date"
              value={filters.endDate ?? ""}
              onChange={(e) => patchFilters({ endDate: e.target.value })}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="flex flex-wrap gap-1 items-center pb-0.5">
            {presets.map((p, i) => (
              <button
                key={p.start}
                type="button"
                onClick={() => {
                  const next = {
                    ...filters,
                    startDate: p.start,
                    endDate: p.end,
                    offset: 0,
                  };
                  setFilters(next);
                  setApplied(next);
                }}
                className="text-[10px] font-semibold px-2 py-1 rounded-full border border-slate-200 hover:bg-slate-50 text-slate-600"
              >
                {t(PRESET_KEYS[i])}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-between items-center pt-1 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            {loadState === "ok" ? (
              <>
                {t("audit.showingCount", { shown: logs.length, total })}
                {applied.search ? ` ${t("audit.showingMatch", { query: applied.search })}` : ""}
              </>
            ) : (
              t("audit.filterHint")
            )}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              {t("audit.clear")}
            </button>
            <button
              type="button"
              onClick={applyFilters}
              className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary-container"
            >
              {t("audit.applyFilters")}
            </button>
          </div>
        </div>
      </div>

      {loadState === "loading" && (
        <div className="p-12 text-center text-slate-500">
          <span className="material-symbols-outlined animate-spin text-3xl">
            sync
          </span>
        </div>
      )}

      {loadState === "error" && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
          {errorMessage}
        </div>
      )}

      {loadState === "ok" && (
        <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          {logs.length === 0 ? (
            <p className="p-12 text-center text-slate-500">
              {t("audit.empty")}
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-slate-50 border-b border-outline-variant text-label-caps text-slate-500 text-xs">
                      <th className="p-4 font-semibold">
                        <SortHeader
                          label={t("audit.table.when")}
                          active={sortIndicator("createdAt")}
                          onClick={() => toggleSort("createdAt")}
                        />
                      </th>
                      <th className="p-4 font-semibold">
                        <SortHeader
                          label={t("audit.table.action")}
                          active={sortIndicator("action")}
                          onClick={() => toggleSort("action")}
                        />
                      </th>
                      <th className="p-4 font-semibold">
                        <SortHeader
                          label={t("audit.table.entity")}
                          active={sortIndicator("entityType")}
                          onClick={() => toggleSort("entityType")}
                        />
                      </th>
                      <th className="p-4 font-semibold">{t("audit.table.user")}</th>
                      <th className="p-4 font-semibold">{t("audit.table.partner")}</th>
                      <th className="p-4 font-semibold text-right">{t("audit.table.details")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant">
                    {logs.map((log) => (
                      <tr
                        key={log.id}
                        className="hover:bg-slate-50/50 cursor-pointer"
                        onClick={() => setSelected(log)}
                      >
                        <td className="p-4 text-slate-500 whitespace-nowrap">
                          {formatAuditWhen(log.createdAt)}
                        </td>
                        <td className="p-4 font-medium text-slate-800">
                          {log.action}
                        </td>
                        <td className="p-4 text-slate-600">
                          {log.entityType && log.entityId ? (
                            <span className="font-mono text-xs">
                              {log.entityType} · {log.entityId.slice(0, 8)}…
                            </span>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-4 text-slate-600">
                          {auditActorLabel(log)}
                        </td>
                        <td className="p-4 text-slate-500 text-xs">
                          {log.relatedTenant?.code ??
                            (log.relatedTenantId
                              ? log.relatedTenantId.slice(0, 8)
                              : "—")}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            className="text-primary text-xs font-semibold hover:underline"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelected(log);
                            }}
                          >
                            {t("audit.view")}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50 text-sm">
                  <button
                    type="button"
                    disabled={page <= 0}
                    onClick={() => goToPage(page - 1)}
                    className="px-3 py-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-white"
                  >
                    {t("audit.pagination.previous")}
                  </button>
                  <span className="text-slate-600 text-xs">
                    {t("audit.pagination.page", { current: page + 1, total: totalPages })}
                  </span>
                  <button
                    type="button"
                    disabled={page + 1 >= totalPages}
                    onClick={() => goToPage(page + 1)}
                    className="px-3 py-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-white"
                  >
                    {t("audit.pagination.next")}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function SortHeader({
  label,
  active,
  onClick,
}: {
  label: string;
  active: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-0.5 hover:text-teal-800 uppercase"
    >
      {label}
      {active && <span className="text-teal-700 normal-case">{active}</span>}
    </button>
  );
}
