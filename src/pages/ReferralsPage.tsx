import { Link } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, isAbortError } from "@/lib/api";
import { useSession } from "@/context/SessionContext";
import { useTenantApi } from "@/lib/tenantApi";
import ForbiddenView from "@/components/ForbiddenView";
import ReferralActions from "@/components/ReferralActions";
import {
  type ApiReferral,
  referralDirection,
  referralStatusClass,
} from "@/lib/referralsApi";

type ReferralsResponse = { referrals?: ApiReferral[] };

export default function ReferralsPage() {
  const { t } = useTranslation();
  const { user } = useSession();
  const { tenantId, get } = useTenantApi();
  const [rows, setRows] = useState<ApiReferral[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ok" | "error" | "forbidden">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "incoming" | "outgoing">("all");

  const loadReferrals = useCallback(async (signal?: AbortSignal) => {
    if (!tenantId) return;
    setLoadState("loading");
    setErrorMessage(null);
    try {
      const data = (await get("/api/v1/referrals", {}, { signal })) as ReferralsResponse;
      if (signal?.aborted) return;
      setRows(Array.isArray(data.referrals) ? data.referrals : []);
      setLoadState("ok");
    } catch (e) {
      if (signal?.aborted || isAbortError(e)) return;
      if (e instanceof ApiError && e.status === 403) {
        setLoadState("forbidden");
        setErrorMessage(e.message);
        return;
      }
      setErrorMessage(
        e instanceof ApiError ? e.message : t("referrals.loadFailed"),
      );
      setLoadState("error");
    }
  }, [tenantId, get, t]);

  useEffect(() => {
    if (!tenantId) {
      setLoadState("error");
      setErrorMessage(t("referrals.noTenant"));
      return;
    }
    const ac = new AbortController();
    void loadReferrals(ac.signal);
    return () => ac.abort();
  }, [tenantId, loadReferrals, t]);

  const filtered = rows.filter((r) => {
    if (!tenantId || filter === "all") return true;
    const dir = referralDirection(r, tenantId);
    return filter === "incoming" ? dir === "incoming" : dir === "outgoing";
  });

  if (loadState === "forbidden") {
    return (
      <ForbiddenView
        resourceKey="referrals.forbiddenResource"
        detail={errorMessage ?? t("referrals.forbiddenDetail")}
      />
    );
  }

  return (
    <div className="p-gutter max-w-7xl mx-auto w-full pb-10">
      <header className="mb-8">
        <div className="flex items-center gap-2 text-slate-500 font-label-caps text-xs mb-2">
          <span>{t("portal.breadcrumb.portal")}</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">{t("portal.breadcrumb.referrals")}</span>
        </div>
        <h1 className="font-h1 text-primary">{t("referrals.title")}</h1>
        <p className="font-body-md text-slate-600 mt-1">{t("referrals.subtitle")}</p>
      </header>

      {loadState === "ok" && (
        <div className="flex flex-wrap gap-2 mb-4">
          {(["all", "incoming", "outgoing"] as const).map((f) => (
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
              {t(`referrals.filter.${f}`)}
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
            <p className="p-12 text-center text-slate-500">{t("referrals.empty")}</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-outline-variant text-label-caps text-slate-500 text-xs">
                    <th className="p-4 font-semibold">{t("referrals.table.case")}</th>
                    <th className="p-4 font-semibold">{t("referrals.table.direction")}</th>
                    <th className="p-4 font-semibold">{t("referrals.table.status")}</th>
                    <th className="p-4 font-semibold">{t("referrals.table.referred")}</th>
                    <th className="p-4 font-semibold text-right">{t("referrals.table.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant">
                  {filtered.map((r) => {
                    const dir = tenantId ? referralDirection(r, tenantId) : "other";
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/50 align-top">
                        <td className="p-4 text-sm">
                          <span className="font-system-id text-slate-600">
                            {r.case?.caseNumber ?? r.caseId.slice(0, 8)}
                          </span>
                          {r.case?.title && (
                            <p className="text-slate-800 font-medium mt-0.5 truncate max-w-xs">{r.case.title}</p>
                          )}
                          {r.referralReason && (
                            <p className="text-xs text-slate-500 mt-1 line-clamp-2">{r.referralReason}</p>
                          )}
                        </td>
                        <td className="p-4 text-sm text-slate-700">
                          <span className="block">
                            {r.fromTenant?.code ?? "—"} → {r.toTenant?.code ?? "—"}
                          </span>
                          {dir === "incoming" && (
                            <span className="text-[10px] font-bold uppercase text-teal-700 mt-1 inline-block">
                              {t("referrals.direction.incoming")}
                            </span>
                          )}
                          {dir === "outgoing" && (
                            <span className="text-[10px] font-bold uppercase text-slate-500 mt-1 inline-block">
                              {t("referrals.direction.outgoing")}
                            </span>
                          )}
                        </td>
                        <td className="p-4">
                          <span
                            className={`px-2 py-1 rounded text-xs font-bold uppercase ${referralStatusClass(r.status)}`}
                          >
                            {r.status}
                          </span>
                        </td>
                        <td className="p-4 text-sm text-slate-500 whitespace-nowrap">
                          {r.referredAt ? new Date(r.referredAt).toLocaleString() : "—"}
                        </td>
                        <td className="p-4">
                          <div className="flex flex-col items-end gap-2">
                            {tenantId && user?.id && (
                              <ReferralActions
                                referral={r}
                                actorTenantId={tenantId}
                                userId={user.id}
                                onUpdated={() => void loadReferrals()}
                              />
                            )}
                            <Link
                              to={`/cases/${encodeURIComponent(r.caseId)}`}
                              className="text-primary text-sm font-semibold hover:underline"
                            >
                              {t("referrals.openCase")}
                            </Link>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
