import { Link } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
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
        setLoadError(e instanceof ApiError ? e.message : "Could not load the agency directory.");
        setTenants([]);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  const activeCount = tenants.filter((t) => t.isActive !== false).length;

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
          <span>PORTAL</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span>PLATFORM</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">AGENCY DIRECTORY</span>
        </div>
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="font-h1 text-primary">Registered agencies</h1>
            <p className="font-body-md text-slate-600 mt-1">
              All organizations on the platform. Case and workflow activity is not shown here — sign in as each
              agency&apos;s operational users to work cases.
            </p>
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
                Register new agency
              </button>
            </Can>
          </div>
        </div>
      </div>

      {lastCreatedAgency && (
        <div className="mb-6 p-4 rounded-xl border border-teal-200 bg-teal-50 text-teal-900 text-sm flex flex-wrap items-center justify-between gap-3">
          <p>
            <span className="font-semibold">Recently registered:</span> {lastCreatedAgency.name}{" "}
            <span className="font-mono">({lastCreatedAgency.code})</span> — share the tenant code and password with the
            new administrator.
          </p>
          <button
            type="button"
            className="text-sm font-semibold text-teal-800 underline hover:no-underline"
            onClick={() => setLastCreatedAgency(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter mb-8">
        <Stat
          label="AGENCIES"
          value={loading ? "…" : String(tenants.length)}
          sub="From GET /api/v1/tenants"
          valueClass="text-teal-700"
        />
        <Stat
          label="ACTIVE"
          value={loading ? "…" : String(activeCount)}
          sub="Organizations marked active"
          valueClass="text-emerald-700"
        />
        <div className="bg-white p-lg border border-outline-variant rounded-xl flex flex-col gap-1">
          <span className="font-label-caps text-slate-500">OPERATIONAL DATA</span>
          <span className="font-h2 text-slate-600">Not shown</span>
          <span className="text-xs text-slate-500 font-medium">Cases and workflows are tenant-scoped.</span>
        </div>
      </div>

      {loadError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-lg text-amber-900 mb-6">
          <p className="font-semibold">Could not load directory</p>
          <p className="text-sm mt-1">{loadError}</p>
        </div>
      )}

      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden">
        <div className="p-lg border-b border-outline-variant bg-slate-50">
          <p className="text-sm text-slate-600">
            Platform-wide registry. Open a row for public tenant metadata only (no case or workflow metrics).
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-primary text-white">
              <tr>
                {["CODE", "AGENCY NAME", "STATUS", "PROFILE"].map((h) => (
                  <th
                    key={h}
                    className={`p-md font-label-caps tracking-widest text-xs ${h === "PROFILE" ? "text-right" : ""}`}
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
                    Loading…
                  </td>
                </tr>
              ) : tenants.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-lg text-center text-slate-500">
                    No agencies returned.
                  </td>
                </tr>
              ) : (
                tenants.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                    <td className="p-md font-system-id font-bold text-teal-800">{t.code}</td>
                    <td className="p-md font-body-sm font-semibold text-slate-900">{t.name}</td>
                    <td className="p-md">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold border bg-green-50 text-green-700 border-green-200">
                        {t.isActive === false ? "INACTIVE" : "ACTIVE"}
                      </span>
                    </td>
                    <td className="p-md text-right">
                      <Link
                        to={`/agencies/${encodeURIComponent(t.code.toLowerCase())}`}
                        className="text-primary hover:text-teal-700 font-semibold text-sm"
                      >
                        Open profile
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
      fetch("http://127.0.0.1:7377/ingest/6302afe2-f95e-483b-b849-884818589670", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "99907a" },
        body: JSON.stringify({
          sessionId: "99907a",
          runId: "post-session-normalize",
          hypothesisId: "H1",
          location: "AgenciesPage.tsx:fetch:start",
          message: "agencies load tenant resolution",
          data: {
            tenantFromNestedObject: Boolean(tenant?.id),
            tenantFromFlat: Boolean(user?.tenantId),
            effectiveTenantIdForPage: tenantId ?? null,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
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
        fetch("http://127.0.0.1:7377/ingest/6302afe2-f95e-483b-b849-884818589670", {
          method: "POST",
          headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "99907a" },
          body: JSON.stringify({
            sessionId: "99907a",
            runId: "post-session-normalize",
            hypothesisId: "H4",
            location: "AgenciesPage.tsx:fetch:error",
            message: "agencies bundle API error",
            data: {
              isApiError: e instanceof ApiError,
              status: e instanceof ApiError ? e.status : null,
              name: e instanceof Error ? e.name : "unknown",
            },
            timestamp: Date.now(),
          }),
        }).catch(() => {});
        const msg =
          e instanceof ApiError
            ? e.message
            : "Could not load tenant or case count. Ensure gateway, auth, and case services are running.";
        setLoadError(msg);
        setCaseCount(null);
        setTenantDetail(null);
      }
    })();
    return () => ac.abort();
  }, [tenantId, tenant?.id, user?.tenantId]);

  const profileHref = useMemo(() => {
    const code = tenantDetail?.code ?? tenant?.code;
    if (!code) return null;
    return `/agencies/${encodeURIComponent(code.toLowerCase())}`;
  }, [tenantDetail?.code, tenant?.code]);

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
          <span>PORTAL</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span>INTER-AGENCY NETWORK</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">AGENCY DIRECTORY</span>
        </div>
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="font-h1 text-primary">Partner Agency Registry</h1>
            <p className="font-body-md text-slate-600 mt-1">
              Your session tenant from the IACMS gateway. Full multi-tenant directory requires additional APIs.
            </p>
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
                Register new agency
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
                Request partnership
              </button>
            </Can>
          </div>
        </div>
      </div>

      {lastCreatedAgency && (
        <div className="mb-6 p-4 rounded-xl border border-teal-200 bg-teal-50 text-teal-900 text-sm flex flex-wrap items-center justify-between gap-3">
          <p>
            <span className="font-semibold">Recently registered:</span> {lastCreatedAgency.name}{" "}
            <span className="font-mono">({lastCreatedAgency.code})</span> — share the tenant code and password with the
            new administrator.
          </p>
          <button
            type="button"
            className="text-sm font-semibold text-teal-800 underline hover:no-underline"
            onClick={() => setLastCreatedAgency(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-8">
        <Stat label="REGISTERED (SESSION)" value={tenant ? "1" : "0"} sub="Tenant on your login" />
        <Stat
          label="OPEN CASES"
          value={caseCount === null ? "—" : String(caseCount)}
          sub="GET /api/v1/cases for your tenant"
          valueClass="text-teal-700"
        />
        <Stat
          label="TENANT STATUS"
          value={tenantDetail?.isActive === false ? "Inactive" : "Active"}
          hint={tenantDetail?.code ? `Code ${tenantDetail.code}` : undefined}
          hintIcon="verified"
          hintClass="text-teal-600"
        />
        <div className="bg-white p-lg border border-outline-variant rounded-xl flex flex-col gap-1">
          <span className="font-label-caps text-slate-500">GATEWAY</span>
          <span className="font-h2 text-slate-800">Connected</span>
          <span className="text-xs text-slate-500 font-medium">Session + tenant APIs</span>
        </div>
      </div>

      {loadError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-lg text-amber-900 mb-6">
          <p className="font-semibold">Could not load registry details</p>
          <p className="text-sm mt-1">{loadError}</p>
        </div>
      )}

      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden">
        <div className="p-lg border-b border-outline-variant bg-slate-50">
          <p className="text-sm text-slate-600">
            Directory row is populated from <span className="font-mono text-xs">GET /api/v1/tenants/:id</span> and your
            session.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-primary text-white">
              <tr>
                {["CODE", "AGENCY NAME", "STATUS", "LINKED CASES", "PROFILE"].map((h) => (
                  <th
                    key={h}
                    className={`p-md font-label-caps tracking-widest text-xs ${h === "PROFILE" ? "text-right" : ""}`}
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
                    No tenant on session. Sign in with a tenant code (e.g. TEST-ORG).
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
                      {tenantDetail?.isActive === false ? "INACTIVE" : "ACTIVE"}
                    </span>
                  </td>
                  <td className="p-md font-body-sm font-semibold text-slate-800">
                    {caseCount === null ? "—" : caseCount.toLocaleString()}
                  </td>
                  <td className="p-md text-right">
                    {profileHref ? (
                      <Link to={profileHref} className="text-primary hover:text-teal-700 font-semibold text-sm">
                        Open profile
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
            Showing your tenant only · Configure RBAC for broader directory access when the backend supports it.
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        <div className="bg-white border border-outline-variant rounded-xl p-lg">
          <h3 className="font-h3 text-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">verified</span>
            Data-sharing posture
          </h3>
          <p className="font-body-md text-slate-600 mb-6">
            Each partner signs a bilateral or mesh agreement before elevated case payloads cross agency boundaries.
          </p>
          <ul className="space-y-4">
            <li className="flex gap-3 border-l-2 border-teal-600 pl-3">
              <div>
                <p className="font-label-caps text-xs text-slate-500">TIER A</p>
                <p className="font-body-sm font-semibold text-slate-900">Full operational sync</p>
                <p className="text-xs text-slate-500">Eligible for escalation routing and dossier export.</p>
              </div>
            </li>
          </ul>
        </div>
        <div className="bg-primary-container text-white rounded-xl p-lg flex flex-col justify-between overflow-hidden relative min-h-[260px]">
          <div className="relative z-10">
            <h3 className="font-h3 mb-2">Network health</h3>
            <p className="text-teal-100 font-body-sm mb-6">Placeholder metrics until observability is wired.</p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-teal-200 font-label-caps text-xs block">API</span>
                <span className="font-h2 text-white">Gateway</span>
              </div>
              <div>
                <span className="text-teal-200 font-label-caps text-xs block">SESSION</span>
                <span className="font-h2 text-white">{user ? "Active" : "—"}</span>
              </div>
            </div>
          </div>
          <span className="material-symbols-outlined absolute -right-8 -bottom-8 text-[180px] opacity-15 pointer-events-none">hub</span>
        </div>
      </div>
    </div>
  );
}
