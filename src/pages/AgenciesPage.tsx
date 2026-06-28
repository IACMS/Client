import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useIsAdmin, useSession } from "@/context/SessionContext";
import RequestPartnershipModal from "@/components/RequestPartnershipModal";
import CreateAgencyModal from "@/components/CreateAgencyModal";
import Can from "@/permissions/Can";
import { usePermissions } from "@/permissions/usePermissions";
import { ApiError, apiGet, isAbortError } from "@/lib/api";
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

export default function AgenciesPage() {
  const { isSystemAdmin } = useIsAdmin();
  if (isSystemAdmin) return <PlatformAgenciesDirectory />;
  return <TenantAgenciesDirectory />;
}

/**
 * Platform operators: full tenant registry from GET /api/v1/tenants.
 * No case counts or operational case APIs — those require tenant-scoped case permissions.
 */
function PlatformAgenciesDirectory() {
  const { t } = useTranslation();
  const { user } = useSession();
  const { can } = usePermissions();
  const canCreateTenant = can("platform:manage_tenants");
  const [tenants, setTenants] = useState<TenantApi[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [createAgencyOpen, setCreateAgencyOpen] = useState(false);
  const [lastCreatedAgency, setLastCreatedAgency] = useState<{ code: string; name: string } | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const data = (await apiGet("/api/v1/tenants", { signal: ac.signal })) as { tenants?: TenantApi[] };
        if (!ac.signal.aborted) setTenants(Array.isArray(data.tenants) ? data.tenants : []);
      } catch (e) {
        if (isAbortError(e) || ac.signal.aborted) return;
        setLoadError(e instanceof ApiError ? e.message : t("agencies.loadFailedGeneric"));
        setTenants([]);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [t]);

  const activeCount = tenants.filter((tenant) => tenant.isActive !== false).length;

  const tableHeaders = [
    t("agencies.table.code"),
    t("agencies.table.name"),
    t("agencies.table.status"),
    t("agencies.table.profile"),
  ];

  return (
    <div className="p-gutter max-w-7xl mx-auto w-full pb-10">
      {canCreateTenant && (
        <CreateAgencyModal
          open={createAgencyOpen}
          onClose={() => setCreateAgencyOpen(false)}
          onCreated={({ code, name }) => {
            setLastCreatedAgency({ code, name });
            void (async () => {
              try {
                const data = (await apiGet("/api/v1/tenants")) as { tenants?: TenantApi[] };
                setTenants(Array.isArray(data.tenants) ? data.tenants : []);
              } catch {
                /* refresh best-effort */
              }
            })();
          }}
        />
      )}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-slate-500 font-label-caps text-xs mb-2 flex-wrap">
          <span>{t("portal.breadcrumb.portal")}</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span>{t("portal.breadcrumb.platform")}</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">{t("portal.breadcrumb.agencyDirectory")}</span>
        </div>
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="font-h1 text-primary">{t("agencies.platform.title")}</h1>
            <p className="font-body-md text-slate-600 mt-1">{t("agencies.platform.subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Can permission="platform:manage_tenants">
              <button
                type="button"
                disabled={!user}
                onClick={() => setCreateAgencyOpen(true)}
                className="bg-white text-primary border-2 border-primary px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">add_business</span>
                {t("agencies.registerNew")}
              </button>
            </Can>
          </div>
        </div>
      </div>

      {lastCreatedAgency && (
        <div className="mb-6 p-4 rounded-xl border border-teal-200 bg-teal-50 text-teal-900 text-sm flex flex-wrap items-center justify-between gap-3">
          <p>
            <span className="font-semibold">{t("agencies.recentlyRegistered")}</span> {lastCreatedAgency.name}{" "}
            <span className="font-mono">({lastCreatedAgency.code})</span> {t("agencies.recentlyRegisteredHint")}
          </p>
          <button
            type="button"
            className="text-sm font-semibold text-teal-800 underline hover:no-underline"
            onClick={() => setLastCreatedAgency(null)}
          >
            {t("common.dismiss")}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-8">
        <Stat
          label={t("agencies.stats.agencies")}
          value={loading ? "…" : String(tenants.length)}
          sub={t("agencies.stats.fromApi")}
          valueClass="text-teal-700"
        />
        <Stat
          label={t("agencies.stats.active")}
          value={loading ? "…" : String(activeCount)}
          sub={t("agencies.stats.activeHint")}
          valueClass="text-emerald-700"
        />
        <div className="bg-white p-lg border border-outline-variant rounded-xl flex flex-col gap-1">
          <span className="font-label-caps text-slate-500">{t("agencies.stats.operationalData")}</span>
          <span className="font-h2 text-slate-600">{t("agencies.stats.notShown")}</span>
          <span className="text-xs text-slate-500 font-medium">{t("agencies.stats.tenantScoped")}</span>
        </div>
      </div>

      {loadError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-lg text-amber-900 mb-6">
          <p className="font-semibold">{t("agencies.loadFailedTitle")}</p>
          <p className="text-sm mt-1">{loadError}</p>
        </div>
      )}

      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden">
        <div className="p-lg border-b border-outline-variant bg-slate-50">
          <p className="text-sm text-slate-600">{t("agencies.platform.registryIntro")}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-primary text-white">
              <tr>
                {tableHeaders.map((h) => (
                  <th
                    key={h}
                    className={`p-md font-label-caps tracking-widest text-xs ${h === t("agencies.table.profile") ? "text-right" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading && tenants.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-lg text-center text-slate-500">
                    <span className="material-symbols-outlined align-middle animate-spin">progress_activity</span>{" "}
                    {t("common.loading")}
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-lg text-center text-slate-500">
                    {t("agencies.empty")}
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-md font-system-id font-bold text-teal-800">{tenant.code}</td>
                    <td className="p-md font-body-sm font-semibold text-slate-900">{tenant.name}</td>
                    <td className="p-md">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-green-50 text-green-700 border-green-200">
                        {tenant.isActive === false ? t("agencies.status.inactive") : t("agencies.status.active")}
                      </span>
                    </td>
                    <td className="p-md text-right">
                      <Link
                        to={`/agencies/${encodeURIComponent(tenant.code.toLowerCase())}`}
                        className="text-primary hover:text-teal-700 font-semibold text-sm"
                      >
                        {t("agencies.openProfile")}
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function TenantAgenciesDirectory() {
  const { t } = useTranslation();
  const { user } = useSession();
  const tenant = user?.tenant;
  const tenantId = tenant?.id ?? user?.tenantId;
  const { can } = usePermissions();
  const canCreateTenant = can("platform:manage_tenants");
  const canRefer = can("referrals:create");
  const [caseCount, setCaseCount] = useState<number | null>(null);
  const [tenantDetail, setTenantDetail] = useState<TenantApi | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [partnershipOpen, setPartnershipOpen] = useState(false);
  const [createAgencyOpen, setCreateAgencyOpen] = useState(false);
  const [lastCreatedAgency, setLastCreatedAgency] = useState<{ code: string; name: string } | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      if (!tenantId) {
        setCaseCount(null);
        setTenantDetail(null);
        return;
      }
      setLoadError(null);
      try {
        const [casesData, tenantRes] = await Promise.all([
          apiGet(`/api/v1/cases?tenantId=${encodeURIComponent(tenantId)}`, {
            signal: ac.signal,
          }) as Promise<CasesResponse>,
          apiGet(`/api/v1/tenants/${encodeURIComponent(tenantId)}`, {
            signal: ac.signal,
          }) as Promise<TenantResponse>,
        ]);
        if (ac.signal.aborted) return;
        const list = Array.isArray(casesData.cases) ? casesData.cases : [];
        setCaseCount(list.length);
        setTenantDetail(tenantRes.tenant ?? null);
      } catch (e) {
        if (isAbortError(e) || ac.signal.aborted) return;
        const msg =
          e instanceof ApiError
            ? e.message
            : t("agencies.tenantLoadFailed");
        setLoadError(msg);
        setCaseCount(null);
        setTenantDetail(null);
      }
    })();
    return () => ac.abort();
  }, [tenantId, tenant?.id, user?.tenantId, t]);

  const profileHref = useMemo(() => {
    const code = tenantDetail?.code ?? tenant?.code;
    if (!code) return null;
    return `/agencies/${encodeURIComponent(code.toLowerCase())}`;
  }, [tenantDetail?.code, tenant?.code]);

  const tableHeaders = [
    t("agencies.table.code"),
    t("agencies.table.name"),
    t("agencies.table.status"),
    t("agencies.table.linkedCases"),
    t("agencies.table.profile"),
  ];

  return (
    <div className="p-gutter max-w-7xl mx-auto w-full pb-10">
      {tenantId && user?.id && canRefer && (
        <RequestPartnershipModal
          open={partnershipOpen}
          onClose={() => setPartnershipOpen(false)}
          fromTenantId={tenantId}
          userId={user.id}
        />
      )}
      {canCreateTenant && (
        <CreateAgencyModal
          open={createAgencyOpen}
          onClose={() => setCreateAgencyOpen(false)}
          onCreated={({ code, name }) => setLastCreatedAgency({ code, name })}
        />
      )}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-slate-500 font-label-caps text-xs mb-2 flex-wrap">
          <span>{t("portal.breadcrumb.portal")}</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span>{t("portal.breadcrumb.interAgencyNetwork")}</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">{t("portal.breadcrumb.agencyDirectory")}</span>
        </div>
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="font-h1 text-primary">{t("agencies.tenant.title")}</h1>
            <p className="font-body-md text-slate-600 mt-1">{t("agencies.tenant.subtitle")}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Can permission="platform:manage_tenants">
              <button
                type="button"
                disabled={!user}
                onClick={() => setCreateAgencyOpen(true)}
                className="bg-white text-primary border-2 border-primary px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-slate-50 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">add_business</span>
                {t("agencies.registerNew")}
              </button>
            </Can>
            <Can permission="referrals:create">
              <button
                type="button"
                disabled={!tenantId || !user?.id}
                onClick={() => setPartnershipOpen(true)}
                className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-primary-container transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <span className="material-symbols-outlined">domain_add</span>
                {t("agencies.requestPartnership")}
              </button>
            </Can>
          </div>
        </div>
      </div>

      {lastCreatedAgency && (
        <div className="mb-6 p-4 rounded-xl border border-teal-200 bg-teal-50 text-teal-900 text-sm flex flex-wrap items-center justify-between gap-3">
          <p>
            <span className="font-semibold">{t("agencies.recentlyRegistered")}</span> {lastCreatedAgency.name}{" "}
            <span className="font-mono">({lastCreatedAgency.code})</span> {t("agencies.recentlyRegisteredHint")}
          </p>
          <button
            type="button"
            className="text-sm font-semibold text-teal-800 underline hover:no-underline"
            onClick={() => setLastCreatedAgency(null)}
          >
            {t("common.dismiss")}
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-8">
        <Stat label={t("agencies.stats.registeredSession")} value={tenant ? "1" : "0"} sub={t("agencies.stats.sessionHint")} />
        <Stat
          label={t("agencies.stats.openCases")}
          value={caseCount === null ? "—" : String(caseCount)}
          sub={t("agencies.stats.casesHint")}
          valueClass="text-teal-700"
        />
        <Stat
          label={t("agencies.stats.tenantStatus")}
          value={tenantDetail?.isActive === false ? t("common.inactive") : t("common.active")}
          hint={tenantDetail?.code ? t("agencies.stats.codeHint", { code: tenantDetail.code }) : undefined}
          hintIcon="verified"
          hintClass="text-teal-600"
        />
        <div className="bg-white p-lg border border-outline-variant rounded-xl flex flex-col gap-1">
          <span className="font-label-caps text-slate-500">{t("agencies.stats.gateway")}</span>
          <span className="font-h2 text-slate-800">{t("agencies.stats.connected")}</span>
          <span className="text-xs text-slate-500 font-medium">{t("agencies.stats.gatewayHint")}</span>
        </div>
      </div>

      {loadError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-lg text-amber-900 mb-6">
          <p className="font-semibold">{t("agencies.registryDetailsFailed")}</p>
          <p className="text-sm mt-1">{loadError}</p>
        </div>
      )}

      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden">
        <div className="p-lg border-b border-outline-variant bg-slate-50">
          <p className="text-sm text-slate-600">{t("agencies.tenant.registryIntro")}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-primary text-white">
              <tr>
                {tableHeaders.map((h) => (
                  <th
                    key={h}
                    className={`p-md font-label-caps tracking-widest text-xs ${h === t("agencies.table.profile") ? "text-right" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {!tenant && !tenantDetail ? (
                <tr>
                  <td colSpan={5} className="p-lg text-center text-slate-500">
                    {t("agencies.noTenant")}
                  </td>
                </tr>
              ) : (
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="p-md font-system-id font-bold text-teal-800">
                    {tenantDetail?.code ?? tenant?.code ?? "—"}
                  </td>
                  <td className="p-md font-body-sm font-semibold text-slate-900">
                    {tenantDetail?.name ?? tenant?.name ?? "—"}
                  </td>
                  <td className="p-md">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-green-50 text-green-700 border-green-200">
                      {tenantDetail?.isActive === false ? t("agencies.status.inactive") : t("agencies.status.active")}
                    </span>
                  </td>
                  <td className="p-md font-body-sm font-semibold text-slate-800">
                    {caseCount === null ? "—" : caseCount.toLocaleString()}
                  </td>
                  <td className="p-md text-right">
                    {profileHref ? (
                      <Link to={profileHref} className="text-primary hover:text-teal-700 font-semibold text-sm">
                        {t("agencies.openProfile")}
                      </Link>
                    ) : (
                      <span className="text-slate-400 text-sm">—</span>
                    )}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="p-lg border-t border-outline-variant bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-500">
            {t("agencies.showingTenantOnly")}
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        <div className="bg-white border border-outline-variant rounded-xl p-lg">
          <h3 className="font-h3 text-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">verified</span>
            {t("agencies.dataSharing.title")}
          </h3>
          <p className="font-body-md text-slate-600 mb-6">
            {t("agencies.dataSharing.body")}
          </p>
          <ul className="space-y-4">
            <li className="flex gap-3 border-l-2 border-teal-600 pl-3">
              <div>
                <p className="font-label-caps text-xs text-slate-500">{t("agencies.dataSharing.tierA")}</p>
                <p className="font-body-sm font-semibold text-slate-900">{t("agencies.dataSharing.fullSync")}</p>
                <p className="text-xs text-slate-500">{t("agencies.dataSharing.fullSyncHint")}</p>
              </div>
            </li>
          </ul>
        </div>
        <div className="bg-primary-container text-white rounded-xl p-lg flex flex-col justify-between overflow-hidden relative min-h-[260px]">
          <div className="relative z-10">
            <h3 className="font-h3 mb-2">{t("agencies.networkHealth.title")}</h3>
            <p className="text-teal-100 font-body-sm mb-6">{t("agencies.networkHealth.placeholder")}</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-teal-200 font-label-caps text-xs block">{t("agencies.networkHealth.api")}</span>
                <span className="font-h2 text-white">{t("agencies.networkHealth.gateway")}</span>
              </div>
              <div>
                <span className="text-teal-200 font-label-caps text-xs block">{t("agencies.networkHealth.session")}</span>
                <span className="font-h2 text-white">{user ? t("agencies.networkHealth.active") : "—"}</span>
              </div>
            </div>
          </div>
          <span className="material-symbols-outlined absolute -right-8 -bottom-8 text-[180px] opacity-15 pointer-events-none">hub</span>
        </div>
      </div>
    </div>
  );
}
