import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useIsAdmin, useSession } from "@/context/SessionContext";
import { ApiError, apiGet, apiPatch, isAbortError } from "@/lib/api";
import type { ApiCase } from "@/lib/casesApi";

type CasesResponse = { cases?: ApiCase[] };

type TenantApi = {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  isActive?: boolean;
  createdAt?: string;
};

type TenantResponse = { tenant?: TenantApi };

type TenantStats = {
  userCount: number;
  departmentCount: number;
  publishedWorkflowCount: number;
  activeReferralPartners: number;
  lastLoginDate: string | null;
};

export default function AgencyDetailPage() {
  const { t } = useTranslation();
  const { agencySlug } = useParams();
  const slug = useMemo(() => {
    const raw = agencySlug ? decodeURIComponent(agencySlug) : "";
    return raw.trim().toLowerCase();
  }, [agencySlug]);

  const { user } = useSession();
  const { isSystemAdmin } = useIsAdmin();
  const sessionCode = user?.tenant?.code?.toLowerCase() ?? "";
  const tenantId = user?.tenant?.id ?? user?.tenantId;

  const [tenant, setTenant] = useState<TenantApi | null>(null);
  const [caseCount, setCaseCount] = useState<number | null>(null);
  const [stats, setStats] = useState<TenantStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toggling, setToggling] = useState(false);

  const slugMatchesSession = Boolean(slug && sessionCode && slug === sessionCode);

  useEffect(() => {
    const ac = new AbortController();

    if (!slug) {
      setTenant(null);
      setCaseCount(null);
      setError(null);
      return () => ac.abort();
    }

    if (isSystemAdmin) {
      (async () => {
        setError(null);
        setTenant(null);
        setCaseCount(null);
        setStats(null);
        try {
          const d = (await apiGet("/api/v1/tenants", { signal: ac.signal })) as { tenants?: TenantApi[] };
          if (ac.signal.aborted) return;
          const rows = Array.isArray(d.tenants) ? d.tenants : [];
          const match = rows.find((row) => row.code.toLowerCase() === slug);
          if (!match) {
            setError(t("agencies.detail.notInDirectory"));
            return;
          }
          const [full, statsRes] = await Promise.all([
            apiGet(`/api/v1/tenants/${encodeURIComponent(match.id)}`, { signal: ac.signal }) as Promise<TenantResponse>,
            apiGet(`/api/v1/platform/tenants/${encodeURIComponent(match.id)}/stats`, { signal: ac.signal }) as Promise<{ success: boolean; data: TenantStats }>,
          ]);
          if (ac.signal.aborted) return;
          setTenant(full.tenant ?? match);
          setStats(statsRes.data ?? null);
        } catch (e) {
          if (isAbortError(e) || ac.signal.aborted) return;
          setError(e instanceof ApiError ? e.message : t("agencies.detail.loadFailed"));
          setTenant(null);
        }
      })();
      return () => ac.abort();
    }

    if (!slugMatchesSession || !tenantId) {
      setTenant(null);
      setCaseCount(null);
      setError(slug && !slugMatchesSession ? t("agencies.detail.tenantMismatch") : null);
      return () => ac.abort();
    }

    (async () => {
      setError(null);
      try {
        const [tRes, cRes] = await Promise.all([
          apiGet(`/api/v1/tenants/${encodeURIComponent(tenantId)}`, { signal: ac.signal }) as Promise<TenantResponse>,
          apiGet(`/api/v1/cases?tenantId=${encodeURIComponent(tenantId)}`, { signal: ac.signal }) as Promise<CasesResponse>,
        ]);
        if (ac.signal.aborted) return;
        setTenant(tRes.tenant ?? null);
        const list = Array.isArray(cRes.cases) ? cRes.cases : [];
        setCaseCount(list.length);
      } catch (e) {
        if (isAbortError(e) || ac.signal.aborted) return;
        setError(e instanceof ApiError ? e.message : t("agencies.detail.loadFailed"));
        setTenant(null);
        setCaseCount(null);
      }
    })();
    return () => ac.abort();
  }, [isSystemAdmin, slug, slugMatchesSession, tenantId, t]);

  const handleToggleStatus = async () => {
    if (!tenant || toggling) return;
    setToggling(true);
    try {
      await apiPatch(`/api/v1/platform/tenants/${tenant.id}/status`, { isActive: !tenant.isActive });
      setTenant((prev) => prev ? { ...prev, isActive: !prev.isActive } : prev);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed to update status");
    } finally {
      setToggling(false);
    }
  };

  if (!slug) {
    return (
      <div className="p-gutter max-w-3xl mx-auto w-full pb-10">
        <div className="bg-white border border-outline-variant rounded-xl p-xl text-center">
          <h1 className="font-h2 text-primary mb-2">{t("agencies.detail.notFoundTitle")}</h1>
          <Link to="/agencies" className="text-primary font-semibold hover:underline">
            {t("agencies.detail.backToDirectory")}
          </Link>
        </div>
      </div>
    );
  }

  if (!isSystemAdmin && !slugMatchesSession) {
    return (
      <div className="p-gutter max-w-3xl mx-auto w-full pb-10">
        <div className="bg-white border border-outline-variant rounded-xl p-xl text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 mb-4 inline-block">travel_explore</span>
          <h1 className="font-h2 text-primary mb-2">{t("agencies.detail.unavailableTitle")}</h1>
          <p className="font-body-md text-slate-600 mb-6">
            {t("agencies.detail.unavailableBody", {
              sessionCode: sessionCode || t("agencies.detail.sessionNone"),
              slug,
            })}
          </p>
          <Link
            to="/agencies"
            className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-primary-container transition-colors"
          >
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            {t("agencies.detail.backToDirectory")}
          </Link>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-gutter max-w-3xl mx-auto w-full pb-10">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-xl">
          <h1 className="font-h2 text-primary mb-2">{t("agencies.detail.loadFailedTitle")}</h1>
          <p className="text-sm text-amber-900 mb-4">{error}</p>
          <Link to="/agencies" className="text-primary font-semibold hover:underline">
            {t("agencies.detail.back")}
          </Link>
        </div>
      </div>
    );
  }

  if (!tenant) {
    return (
      <div className="flex-1 p-lg max-w-7xl mx-auto flex items-center justify-center min-h-[280px] text-slate-600">
        <span className="material-symbols-outlined text-4xl animate-pulse">progress_activity</span>
        <span className="ml-3">{t("agencies.detail.loading")}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 p-gutter max-w-7xl mx-auto w-full pb-10 space-y-6">
      {/* Header & Breadcrumb */}
      <div>
        <nav className="flex text-label-caps text-slate-500 mb-2 uppercase tracking-widest flex-wrap gap-x-1 items-center text-xs">
          <Link to="/agencies" className="hover:text-primary">
            {t("agencies.detail.breadcrumb")}
          </Link>
          <span className="mx-2">/</span>
          <span>{tenant.code}</span>
          <span className="mx-2">/</span>
          <span className="text-primary font-bold">{tenant.name}</span>
        </nav>
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h1 className="font-h1 text-primary mb-1">{tenant.name}</h1>
            <p className="font-body-md text-slate-600">{t("agencies.detail.tenantCode", { code: tenant.code })}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span
              className={`px-3 py-1 rounded-full text-label-caps font-bold border ${
                tenant.isActive === false
                  ? "bg-amber-50 text-amber-800 border-amber-200"
                  : "bg-green-50 text-green-800 border-green-200"
              }`}
            >
              {tenant.isActive === false ? t("agencies.status.inactive") : t("agencies.status.active")}
            </span>
            {isSystemAdmin && (
              <button
                type="button"
                disabled={toggling}
                onClick={handleToggleStatus}
                className={`text-xs font-semibold px-3 py-1.5 rounded transition-colors disabled:opacity-50 border ${
                  tenant.isActive === false
                    ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                    : "text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200"
                }`}
              >
                {toggling ? "Updating…" : tenant.isActive === false ? "Activate Agency" : "Suspend Agency"}
              </button>
            )}
            {!isSystemAdmin && (
              <span className="text-xs font-system-id text-slate-400">
                {caseCount === null ? "—" : t("agencies.detail.caseCount", { count: caseCount })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Platform-only stats grid */}
      {isSystemAdmin && stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { icon: "group", label: "Active Users", value: stats.userCount, color: "text-teal-700", bg: "bg-teal-50" },
            { icon: "corporate_fare", label: "Departments", value: stats.departmentCount, color: "text-blue-700", bg: "bg-blue-50" },
            { icon: "account_tree", label: "Workflows", value: stats.publishedWorkflowCount, color: "text-violet-700", bg: "bg-violet-50" },
            { icon: "hub", label: "Referral Partners", value: stats.activeReferralPartners, color: "text-emerald-700", bg: "bg-emerald-50" },
            {
              icon: "login", label: "Last Login",
              value: stats.lastLoginDate ? new Date(stats.lastLoginDate).toLocaleDateString() : "Never",
              color: "text-slate-700", bg: "bg-slate-50",
            },
          ].map((s) => (
            <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2 shadow-sm">
              <div className={`${s.bg} p-2 rounded-lg w-fit`}>
                <span className={`material-symbols-outlined text-base ${s.color}`}>{s.icon}</span>
              </div>
              <p className="text-xs text-slate-500 font-semibold uppercase tracking-widest">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Overview */}
      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden min-h-[200px] p-lg">
        <h2 className="font-h3 text-primary mb-4">{t("agencies.detail.overview")}</h2>
        <p className="font-body-md text-slate-600 whitespace-pre-wrap">
          {tenant.description?.trim() ? tenant.description : t("agencies.detail.noDescription")}
        </p>
        {tenant.createdAt && (
          <p className="text-xs text-slate-400 mt-6 font-mono">
            {t("agencies.detail.created", { date: new Date(tenant.createdAt).toLocaleString() })}
          </p>
        )}
      </div>
    </div>
  );
}
