import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { useIsAdmin, useSession } from "@/context/SessionContext";
import RequestPartnershipModal from "@/components/RequestPartnershipModal";
import CreateAgencyModal from "@/components/CreateAgencyModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import Can from "@/permissions/Can";
import { usePermissions } from "@/permissions/usePermissions";
import { ApiError, apiGet, apiPatch, apiPost, isAbortError } from "@/lib/api";
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

function PlatformAgenciesDirectory() {
  const { t } = useTranslation();
  const { user } = useSession();
  const { can } = usePermissions();
  const canCreateTenant = can("platform:manage_tenants");
  const canManage = can("platform:manage_tenants");
  const [tenants, setTenants] = useState<TenantApi[]>([]);
  const [pendingTenants, setPendingTenants] = useState<(TenantApi & { adminUser?: { firstName: string; lastName: string; email: string } })[]>([]);
  const [view, setView] = useState<"ACTIVE" | "PENDING">("ACTIVE");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingPending, setLoadingPending] = useState(true);
  const [createAgencyOpen, setCreateAgencyOpen] = useState(false);
  const [lastCreatedAgency, setLastCreatedAgency] = useState<{ code: string; name: string } | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<TenantApi | null>(null);
  const [confirmDecline, setConfirmDecline] = useState<TenantApi | null>(null);


  const fetchTenants = async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const data = (await apiGet("/api/v1/tenants", { signal })) as { tenants?: TenantApi[] };
      if (!signal?.aborted) setTenants(Array.isArray(data.tenants) ? data.tenants : []);
    } catch (e) {
      if (isAbortError(e) || signal?.aborted) return;
      setLoadError(e instanceof ApiError ? e.message : t("agencies.loadFailedGeneric"));
      setTenants([]);
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  const fetchPending = async (signal?: AbortSignal) => {
    setLoadingPending(true);
    try {
      const data = (await apiGet("/api/v1/platform/agencies/pending", { signal })) as any;
      if (!signal?.aborted) setPendingTenants(Array.isArray(data.pending) ? data.pending : []);
    } catch (e) {
      if (isAbortError(e) || signal?.aborted) return;
    } finally {
      if (!signal?.aborted) setLoadingPending(false);
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    void fetchTenants(ac.signal);
    void fetchPending(ac.signal);
    return () => ac.abort();
  }, [t]);

  const handleToggleStatus = async (tenant: TenantApi) => {
    if (togglingId) return;
    setTogglingId(tenant.id);
    try {
      await apiPatch(`/api/v1/platform/tenants/${tenant.id}/status`, { isActive: !tenant.isActive });
      void fetchTenants();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed to update status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!confirmDelete) return;
    try {
      await apiPatch(`/api/v1/platform/tenants/${confirmDelete.id}/status`, { isActive: false });
      setConfirmDelete(null);
      void fetchTenants();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed to deactivate tenant");
      setConfirmDelete(null);
    }
  };

  const handleApprove = async (tenantId: string) => {
    if (approvingId) return;
    setApprovingId(tenantId);
    try {
      await apiPost(`/api/v1/platform/agencies/${tenantId}/approve`, {});
      void fetchTenants();
      void fetchPending();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed to approve agency");
    } finally {
      setApprovingId(null);
    }
  };

  const handleDeclineConfirmed = async () => {
    if (!confirmDecline) return;
    try {
      await apiPost(`/api/v1/platform/agencies/${confirmDecline.id}/decline`, {});
      setConfirmDecline(null);
      void fetchPending();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed to decline agency");
      setConfirmDecline(null);
    }
  };



  const activeCount = tenants.filter((tenant) => tenant.isActive !== false).length;

  const tableHeaders = [
    t("agencies.table.code"),
    t("agencies.table.name"),
    t("agencies.table.status"),
    "Joined",
    t("agencies.table.profile"),
    ...(canManage ? ["Actions"] : []),
  ];

  return (
    <div className="p-gutter max-w-7xl mx-auto w-full pb-10">
      {canCreateTenant && (
        <CreateAgencyModal
          open={createAgencyOpen}
          onClose={() => setCreateAgencyOpen(false)}
          onCreated={({ code, name }) => {
            setLastCreatedAgency({ code, name });
            void fetchTenants();
          }}
        />
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title={`Deactivate "${confirmDelete?.name}"?`}
        message="This will suspend the agency and deactivate all its users. You can reactivate it later from this page."
        confirmLabel="Deactivate"
        variant="danger"
        onConfirm={handleDeleteConfirmed}
        onCancel={() => setConfirmDelete(null)}
      />



      <ConfirmDialog
        open={!!confirmDecline}
        title={`Decline and remove "${confirmDecline?.name}"?`}
        message="This will permanently delete this registration request and all associated data."
        confirmLabel="Decline & Delete"
        variant="danger"
        onConfirm={handleDeclineConfirmed}
        onCancel={() => setConfirmDecline(null)}
      />

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

      <div className="flex gap-4 border-b border-outline-variant mb-6">
        <button
          className={`pb-2 font-semibold text-sm transition-colors ${view === "ACTIVE" ? "text-primary border-b-2 border-primary" : "text-slate-500 hover:text-slate-800"}`}
          onClick={() => setView("ACTIVE")}
        >
          Active Agencies ({tenants.length})
        </button>
        <button
          className={`pb-2 font-semibold text-sm transition-colors ${view === "PENDING" ? "text-primary border-b-2 border-primary" : "text-slate-500 hover:text-slate-800"}`}
          onClick={() => setView("PENDING")}
        >
          Pending Approvals {pendingTenants.length > 0 && <span className="bg-amber-100 text-amber-800 text-xs px-2 py-0.5 rounded-full ml-1">{pendingTenants.length}</span>}
        </button>
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
          sub={loading ? "" : `${tenants.length - activeCount} suspended`}
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
          {view === "ACTIVE" ? (
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-primary text-white">
              <tr>
                {tableHeaders.map((h) => (
                  <th
                    key={h}
                    className={`p-md font-label-caps tracking-widest text-xs ${h === t("agencies.table.profile") || h === "Actions" ? "text-right" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loading && tenants.length === 0 ? (
                <tr>
                  <td colSpan={tableHeaders.length} className="p-lg text-center text-slate-500">
                    <span className="material-symbols-outlined align-middle animate-spin">progress_activity</span>{" "}
                    {t("common.loading")}
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={tableHeaders.length} className="p-lg text-center text-slate-500">
                    {t("agencies.empty")}
                  </td>
                </tr>
              ) : (
                tenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-md font-system-id font-bold text-teal-800">{tenant.code}</td>
                    <td className="p-md font-body-sm font-semibold text-slate-900">{tenant.name}</td>
                    <td className="p-md">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        tenant.isActive === false
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-green-50 text-green-700 border-green-200"
                      }`}>
                        {tenant.isActive === false ? t("agencies.status.inactive") : t("agencies.status.active")}
                      </span>
                    </td>
                    <td className="p-md text-xs text-slate-500">
                      {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-md text-right">
                      <Link
                        to={`/agencies/${encodeURIComponent(tenant.code.toLowerCase())}`}
                        className="text-primary hover:text-teal-700 font-semibold text-sm"
                      >
                        {t("agencies.openProfile")}
                      </Link>
                    </td>
                        {canManage && (
                      <td className="p-md text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={togglingId === tenant.id}
                            onClick={() => handleToggleStatus(tenant)}
                            className={`text-xs font-semibold px-3 py-1 rounded transition-colors disabled:opacity-50 ${
                              tenant.isActive === false
                                ? "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                                : "text-amber-700 bg-amber-50 hover:bg-amber-100"
                            }`}
                          >
                            {togglingId === tenant.id ? "…" : tenant.isActive === false ? "Activate" : "Suspend"}
                          </button>

                          {tenant.isActive !== false && (
                            <button
                              type="button"
                              onClick={() => setConfirmDelete(tenant)}
                              className="text-xs font-semibold px-3 py-1 rounded text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                            >
                              Archive
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
          ) : (
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-primary text-white">
              <tr>
                <th className="p-md font-label-caps tracking-widest text-xs">Code</th>
                <th className="p-md font-label-caps tracking-widest text-xs">Name</th>
                <th className="p-md font-label-caps tracking-widest text-xs">Requested By</th>
                <th className="p-md font-label-caps tracking-widest text-xs">Requested At</th>
                <th className="p-md font-label-caps tracking-widest text-xs text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {loadingPending && pendingTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-lg text-center text-slate-500">
                    <span className="material-symbols-outlined align-middle animate-spin">progress_activity</span>{" "}
                    Loading...
                  </td>
                </tr>
              ) : pendingTenants.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-lg text-center text-slate-500">
                    No pending registration requests.
                  </td>
                </tr>
              ) : (
                pendingTenants.map((pt) => (
                  <tr key={pt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-md font-system-id font-bold text-amber-700">{pt.code}</td>
                    <td className="p-md font-body-sm font-semibold text-slate-900">{pt.name}</td>
                    <td className="p-md font-body-sm text-slate-700">
                      {pt.adminUser ? (
                        <>
                          {pt.adminUser.firstName} {pt.adminUser.lastName} <br />
                          <span className="text-xs text-slate-500">{pt.adminUser.email}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="p-md text-xs text-slate-500">
                      {pt.createdAt ? new Date(pt.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="p-md text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => void handleApprove(pt.id)}
                          disabled={approvingId === pt.id}
                          className="bg-teal-600 text-white px-3 py-1.5 rounded text-xs font-semibold hover:bg-teal-700 transition"
                        >
                          {approvingId === pt.id ? "Approving..." : "Approve"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDecline(pt)}
                          className="border border-red-200 text-red-700 px-3 py-1.5 rounded text-xs font-semibold hover:bg-red-50 hover:border-red-300 transition"
                        >
                          Decline
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          )}
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
