import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSession } from "@/context/SessionContext";
import Can from "@/permissions/Can";
import { ApiError, apiGet, isAbortError } from "@/lib/api";

type TenantRow = {
  id: string;
  name: string;
  code: string;
  isActive?: boolean;
};

/**
 * Home for platform operators (`platform:manage_tenants`).
 * Operational cases, referrals, and workflows are intentionally omitted — tenant staff use the standard dashboard.
 */
export default function PlatformDashboardPage() {
  const { user } = useSession();
  const greeting = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "there";

  const [loading, setLoading] = useState(true);
  const [tenants, setTenants] = useState<TenantRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        const d = (await apiGet("/api/v1/tenants", { signal: ac.signal })) as { tenants?: TenantRow[] };
        if (!ac.signal.aborted) {
          setTenants(Array.isArray(d.tenants) ? d.tenants : []);
        }
      } catch (e) {
        if (isAbortError(e) || ac.signal.aborted) return;
        setLoadError(e instanceof ApiError ? e.message : "Could not load organizations.");
        setTenants([]);
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  const activeOrgs = tenants.filter((t) => t.isActive !== false).length;

  return (
    <div className="p-gutter max-w-7xl mx-auto space-y-gutter pb-8">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h2 className="font-h2 text-h2 text-primary leading-none">Platform overview</h2>
          <p className="text-slate-500 mt-1">
            Signed in as <span className="font-semibold text-slate-700">{greeting}</span> — register agencies and
            monitor the tenant directory. Case and workflow data stay with each organization.
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Can permission="platform:manage_tenants">
            <Link
              to="/agencies"
              className="px-4 py-2 bg-primary-container text-white rounded-md text-xs font-semibold hover:bg-teal-800 transition-colors inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">domain</span>
              Agency directory
            </Link>
          </Can>
        </div>
      </div>

      {loadError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-sm">{loadError}</div>
      )}

      <div className="grid grid-cols-12 gap-gutter">
        <div className="col-span-12 md:col-span-4 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2 bg-teal-50 rounded-lg">
              <span className="material-symbols-outlined text-teal-700">apartment</span>
            </div>
            <Link
              to="/agencies"
              className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full hover:underline"
            >
              View directory
            </Link>
          </div>
          <h3 className="text-slate-500 text-sm font-label-caps tracking-wider">REGISTERED AGENCIES</h3>
          <p className="text-3xl font-bold text-teal-900 mt-1">{loading ? "…" : tenants.length}</p>
          <p className="mt-4 text-[10px] text-slate-400">Organizations returned from GET /api/v1/tenants.</p>
        </div>

        <div className="col-span-12 md:col-span-4 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <div className="p-2 bg-emerald-50 rounded-lg mb-4 w-fit">
            <span className="material-symbols-outlined text-emerald-700">check_circle</span>
          </div>
          <h3 className="text-slate-500 text-sm font-label-caps tracking-wider">ACTIVE</h3>
          <p className="text-3xl font-bold text-teal-900 mt-1">{loading ? "…" : activeOrgs}</p>
          <p className="mt-4 text-[10px] text-slate-400">Tenants marked active in the registry.</p>
        </div>

        <div className="col-span-12 md:col-span-4 bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
          <div className="p-2 bg-slate-100 rounded-lg mb-4 w-fit">
            <span className="material-symbols-outlined text-slate-600">info</span>
          </div>
          <h3 className="text-slate-500 text-sm font-label-caps tracking-wider">OPERATIONAL DATA</h3>
          <p className="text-lg font-semibold text-slate-800 mt-1">Not shown here</p>
          <p className="mt-4 text-[10px] text-slate-400">
            Cases, referrals, and workflows are visible only when signed in as that agency&apos;s operational staff.
          </p>
        </div>
      </div>
    </div>
  );
}
