import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSession } from "@/context/SessionContext";
import Can from "@/permissions/Can";
import { ApiError, apiGet, apiPatch, isAbortError } from "@/lib/api";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ─── Types ──────────────────────────────────────────────────────────────────

type ServiceHealth = { key: string; ok: boolean };
type HealthSummary = { up: number; down: number; total: number; services: ServiceHealth[] };

type RecentRegistration = {
  id: string;
  name: string;
  code: string;
  createdAt: string;
  isActive: boolean;
  adminEmail: string | null;
};

type TrendPoint = { month: string; registrations: number };
type UserCountPoint = { name: string; users: number };
type StatusSlice = { name: string; value: number; color: string };

type DashboardData = {
  totalTenants: number;
  activeTenants: number;
  inactiveTenantsCount: number;
  pendingOnboardingCount: number;
  totalUsersAcrossPlatform: number;
  platformUsersCount: number;
  recentRegistrations: RecentRegistration[];
  serviceHealth: HealthSummary;
  monthlyTrend: TrendPoint[];
  tenantUserCounts: UserCountPoint[];
  tenantStatusBreakdown: StatusSlice[];
};

// ─── Small Components ────────────────────────────────────────────────────────

function KpiCard({
  icon,
  label,
  value,
  sub,
  iconBg = "bg-teal-50",
  iconColor = "text-teal-700",
  href,
  trend,
}: {
  icon: string;
  label: string;
  value: string | number;
  sub?: string;
  iconBg?: string;
  iconColor?: string;
  href?: string;
  trend?: "up" | "down" | "neutral";
}) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex justify-between items-start">
        <div className={`p-2.5 ${iconBg} rounded-xl`}>
          <span className={`material-symbols-outlined ${iconColor} text-xl`}>{icon}</span>
        </div>
        {href && (
          <Link
            to={href}
            className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full hover:bg-teal-100 transition-colors"
          >
            View →
          </Link>
        )}
      </div>
      <div>
        <p className="text-slate-400 text-[11px] font-semibold tracking-widest uppercase">{label}</p>
        <p className="text-3xl font-extrabold text-slate-800 mt-1 tabular-nums">{value}</p>
        {sub && (
          <p className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
            {trend === "up" && <span className="text-emerald-500 font-bold">↑</span>}
            {trend === "down" && <span className="text-red-400 font-bold">↓</span>}
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

function ServiceHealthDot({ service }: { service: ServiceHealth }) {
  const labels: Record<string, string> = {
    auth: "Auth", rbac: "RBAC", case: "Case", workflow: "Workflow",
    referral: "Referral", audit: "Audit", integration: "Integration",
    notification: "Notification", file: "File",
  };
  return (
    <div
      className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium"
      style={{
        background: service.ok ? "#f0fdf4" : "#fff5f5",
        borderColor: service.ok ? "#bbf7d0" : "#fecaca",
        color: service.ok ? "#15803d" : "#dc2626",
      }}
    >
      <span
        className={`w-2 h-2 rounded-full ${service.ok ? "bg-emerald-400 animate-pulse" : "bg-red-400"}`}
      />
      {labels[service.key] ?? service.key}
    </div>
  );
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100">
        <h2 className="font-semibold text-slate-800">{title}</h2>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  );
}

// Custom tooltip styling shared across charts
const tooltipStyle = {
  contentStyle: {
    background: "#1e293b",
    border: "none",
    borderRadius: "10px",
    color: "#f8fafc",
    fontSize: 12,
    padding: "8px 14px",
  },
  cursor: { fill: "rgba(20,184,166,0.06)" },
};

function AgencyStatusPie({
  loading,
  totalTenants,
  breakdown,
  tooltipStyle: ts,
}: {
  loading: boolean;
  totalTenants: number;
  breakdown: StatusSlice[];
  tooltipStyle: typeof tooltipStyle;
}) {
  // Filter zero-value slices — recharts silently fails on 0° arcs
  const pieData = breakdown.filter((s) => s.value > 0);

  return (
    <ChartCard title="Agency Status" subtitle="Active vs. suspended breakdown">
      {loading ? (
        <div className="h-56 flex items-center justify-center">
          <span className="material-symbols-outlined animate-spin text-4xl text-slate-300">progress_activity</span>
        </div>
      ) : totalTenants === 0 || pieData.length === 0 ? (
        <div className="h-56 flex items-center justify-center text-slate-400 text-sm">No agencies yet</div>
      ) : (
        <div>
          {/* NOTE: Do NOT use items-center on a flex parent of ResponsiveContainer
              — it causes the container to measure 0 width and render blank. */}
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={72}
                paddingAngle={pieData.length > 1 ? 3 : 0}
                dataKey="value"
              >
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                {...ts}
                formatter={(v, name) => [v ?? 0, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex gap-4 flex-wrap justify-center mt-2">
            {breakdown.map((s) => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: s.color }} />
                <span className="font-medium">{s.name}</span>
                <span className="text-slate-400">({s.value})</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function PlatformDashboardPage() {
  const { t } = useTranslation();
  const { user } = useSession();
  const greeting =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || t("dashboard.greetingFallback");

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchDashboard = async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = (await apiGet("/api/v1/platform/dashboard", { signal })) as {
        success: boolean;
        data: DashboardData;
      };
      if (!signal?.aborted) setData(res.data ?? null);
    } catch (e) {
      if (isAbortError(e) || signal?.aborted) return;
      setLoadError(e instanceof ApiError ? e.message : t("dashboard.platform.loadFailed"));
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  };

  useEffect(() => {
    const ac = new AbortController();
    void fetchDashboard(ac.signal);
    return () => ac.abort();
  }, []);

  const handleToggleStatus = async (tenantId: string, currentIsActive: boolean) => {
    if (togglingId) return;
    setTogglingId(tenantId);
    try {
      await apiPatch(`/api/v1/platform/tenants/${tenantId}/status`, { isActive: !currentIsActive });
      void fetchDashboard();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed to update tenant status");
    } finally {
      setTogglingId(null);
    }
  };

  const health = data?.serviceHealth;
  const allHealthy = health ? health.down === 0 : null;

  // Skeleton loader helper
  const Skeleton = ({ w = "w-full", h = "h-4" }: { w?: string; h?: string }) => (
    <div className={`${w} ${h} bg-slate-100 rounded-lg animate-pulse`} />
  );

  return (
    <div className="p-gutter max-w-7xl mx-auto space-y-8 pb-12">
      {/* ── Header ── */}
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <p className="text-teal-600 text-[11px] font-bold tracking-widest uppercase mb-1">
            Platform Administration
          </p>
          <h1 className="font-h1 text-primary leading-none">{t("dashboard.platform.title")}</h1>
          <p className="text-slate-500 mt-1 text-sm">{t("dashboard.platform.intro", { name: greeting })}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Can permission="platform:manage_tenants">
            <Link
              to="/platform/users"
              className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 transition-colors inline-flex items-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-base">manage_accounts</span>
              Platform Users
            </Link>
            <Link
              to="/agencies"
              className="px-4 py-2 bg-teal-700 text-white rounded-lg text-xs font-semibold hover:bg-teal-800 transition-colors inline-flex items-center gap-2 shadow-sm"
            >
              <span className="material-symbols-outlined text-base">domain</span>
              {t("dashboard.platform.agencyDirectory")}
            </Link>
          </Can>
        </div>
      </div>

      {loadError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-sm">
          {loadError}
        </div>
      )}

      {/* ── KPI Grid ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="col-span-2 sm:col-span-1 lg:col-span-2">
          {loading ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <Skeleton w="w-10" h="h-10" />
              <Skeleton w="w-1/2" h="h-3" />
              <Skeleton w="w-1/3" h="h-8" />
            </div>
          ) : (
            <KpiCard icon="apartment" label="Registered Agencies" value={data?.totalTenants ?? 0}
              sub="All tenants on platform" href="/agencies" />
          )}
        </div>
        <div className="col-span-2 sm:col-span-1 lg:col-span-2">
          {loading ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <Skeleton w="w-10" h="h-10" /><Skeleton w="w-1/2" h="h-3" /><Skeleton w="w-1/3" h="h-8" />
            </div>
          ) : (
            <KpiCard icon="check_circle" label="Active Agencies" value={data?.activeTenants ?? 0}
              sub={`${data?.inactiveTenantsCount ?? 0} suspended`}
              iconBg="bg-emerald-50" iconColor="text-emerald-600" trend="up" />
          )}
        </div>
        <div className="col-span-2 sm:col-span-1 lg:col-span-2">
          {loading ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <Skeleton w="w-10" h="h-10" /><Skeleton w="w-1/2" h="h-3" /><Skeleton w="w-1/3" h="h-8" />
            </div>
          ) : (
            <KpiCard icon="group" label="Total Users" value={data?.totalUsersAcrossPlatform ?? 0}
              sub="Across all agencies" iconBg="bg-blue-50" iconColor="text-blue-600" />
          )}
        </div>
        <div className="col-span-2 sm:col-span-1 lg:col-span-2">
          {loading ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <Skeleton w="w-10" h="h-10" /><Skeleton w="w-1/2" h="h-3" /><Skeleton w="w-1/3" h="h-8" />
            </div>
          ) : (
            <KpiCard icon="pending_actions" label="Pending Onboarding" value={data?.pendingOnboardingCount ?? 0}
              sub="Awaiting first login" iconBg="bg-amber-50" iconColor="text-amber-600" />
          )}
        </div>
        <div className="col-span-2 sm:col-span-1 lg:col-span-2">
          {loading ? (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <Skeleton w="w-10" h="h-10" /><Skeleton w="w-1/2" h="h-3" /><Skeleton w="w-1/3" h="h-8" />
            </div>
          ) : (
            <KpiCard icon="manage_accounts" label="Platform Admins" value={data?.platformUsersCount ?? 0}
              sub="Super-admin users" iconBg="bg-violet-50" iconColor="text-violet-600" href="/platform/users" />
          )}
        </div>
        <div className="col-span-2 sm:col-span-1 lg:col-span-2">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div className="p-2.5 bg-slate-50 rounded-xl">
                <span
                  className={`material-symbols-outlined text-xl ${
                    allHealthy === null ? "text-slate-400" : allHealthy ? "text-emerald-500" : "text-red-500"
                  }`}
                >
                  {allHealthy === null ? "info" : allHealthy ? "check_circle" : "warning"}
                </span>
              </div>
              <Link to="/api-health" className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full hover:bg-teal-100 transition-colors">
                Details →
              </Link>
            </div>
            <div>
              <p className="text-slate-400 text-[11px] font-semibold tracking-widest uppercase">System Health</p>
              <p className={`text-lg font-extrabold mt-1 ${allHealthy ? "text-emerald-600" : allHealthy === null ? "text-slate-400" : "text-red-500"}`}>
                {loading ? "…" : allHealthy === null ? "—" : allHealthy ? "All Systems Up" : `${health?.down} Down`}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                {loading ? "" : `${health?.up ?? 0}/${health?.total ?? 0} reachable`}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ── Service health pill strip ── */}
      {health && (
        <div className="bg-white border border-slate-100 rounded-2xl px-5 py-4 shadow-sm">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mb-3">Service Status</p>
          <div className="flex flex-wrap gap-2">
            {health.services.map((s) => (
              <ServiceHealthDot key={s.key} service={s} />
            ))}
          </div>
        </div>
      )}

      {/* ── Charts Row ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Registration Trend — 2/3 width */}
        <div className="lg:col-span-2">
          <ChartCard title="Agency Registration Trend" subtitle="New organizations registered per month (last 6 months)">
            {loading ? (
              <div className="h-56 flex items-center justify-center">
                <span className="material-symbols-outlined animate-spin text-4xl text-slate-300">progress_activity</span>
              </div>
            ) : !data || (data.monthlyTrend ?? []).length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center gap-2 text-slate-400">
                <span className="material-symbols-outlined text-3xl">bar_chart</span>
                <p className="text-sm">No registration data available</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={data.monthlyTrend} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
                  <defs>
                    <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis
                    allowDecimals={false}
                    domain={[0, (dataMax: number) => Math.max(dataMax + 1, 5)]}
                    tick={{ fontSize: 11, fill: "#94a3b8" }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip
                    {...tooltipStyle}
                    formatter={(v) => [v ?? 0, "Registrations"]}
                  />
                  <Area
                    type="monotone"
                    dataKey="registrations"
                    stroke="#0d9488"
                    strokeWidth={2.5}
                    fill="url(#trendGrad)"
                    dot={{ r: 4, fill: "#0d9488", strokeWidth: 0 }}
                    activeDot={{ r: 6, fill: "#0d9488" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </ChartCard>
        </div>

        {/* Status Pie — 1/3 width */}
        <div className="lg:col-span-1">
          <AgencyStatusPie
            loading={loading}
            totalTenants={data?.totalTenants ?? 0}
            breakdown={data?.tenantStatusBreakdown ?? []}
            tooltipStyle={tooltipStyle}
          />
        </div>
      </div>

      {/* ── Users per Agency Bar Chart ── */}
      <ChartCard title="Users per Agency" subtitle="Active user count by organization (top 8)">
        {loading ? (
          <div className="h-56 flex items-center justify-center">
            <span className="material-symbols-outlined animate-spin text-4xl text-slate-300">progress_activity</span>
          </div>
        ) : (data?.tenantUserCounts?.length ?? 0) === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center gap-2 text-slate-400">
            <span className="material-symbols-outlined text-3xl">group</span>
            <p className="text-sm">No user data available yet</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data!.tenantUserCounts} margin={{ top: 4, right: 4, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis
                allowDecimals={false}
                domain={[0, (dataMax: number) => Math.max(dataMax + 1, 5)]}
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                {...tooltipStyle}
                formatter={(v) => [v ?? 0, "Users"]}
              />
              <Bar dataKey="users" fill="#0d9488" radius={[6, 6, 0, 0]} maxBarSize={52} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </ChartCard>

      {/* ── Recent Registrations Table ── */}
      <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="font-semibold text-slate-800">Recent Agency Registrations</h2>
            <p className="text-xs text-slate-400 mt-0.5">Last 10 registered agencies</p>
          </div>
          <Link to="/agencies" className="text-xs font-semibold text-teal-600 hover:underline">
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                {["Agency", "Code", "Admin Email", "Registered", "Status", "Actions"].map((h) => (
                  <th
                    key={h}
                    className={`px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-widest ${
                      h === "Actions" ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-300">
                    <span className="material-symbols-outlined animate-spin text-3xl align-middle">progress_activity</span>
                  </td>
                </tr>
              ) : !data?.recentRegistrations?.length ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                    No agencies registered yet
                  </td>
                </tr>
              ) : (
                data.recentRegistrations.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      <Link
                        to={`/agencies/${encodeURIComponent(tenant.code.toLowerCase())}`}
                        className="hover:text-teal-700"
                      >
                        {tenant.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-teal-800 font-bold">{tenant.code}</td>
                    <td className="px-4 py-3 text-slate-500 text-xs">
                      {tenant.adminEmail ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-400 text-xs">
                      {new Date(tenant.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          tenant.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {tenant.isActive ? "Active" : "Suspended"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Can permission="platform:manage_tenants">
                        <button
                          type="button"
                          disabled={togglingId === tenant.id}
                          onClick={() => handleToggleStatus(tenant.id, tenant.isActive)}
                          className={`text-xs font-semibold px-3 py-1 rounded-lg transition-colors disabled:opacity-50 ${
                            tenant.isActive
                              ? "text-amber-700 bg-amber-50 hover:bg-amber-100"
                              : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                          }`}
                        >
                          {togglingId === tenant.id ? "…" : tenant.isActive ? "Suspend" : "Activate"}
                        </button>
                      </Can>
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
