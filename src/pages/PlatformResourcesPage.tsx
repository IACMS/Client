import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, apiGet, apiPatch, isAbortError } from "@/lib/api";

type TenantQuota = {
  tenantId: string;
  tenantCode: string;
  tenantName: string;
  isActive: boolean;
  quota: {
    storageLimitMb?: number | null;
    storageUsedMb?: number;
    rateLimitMax?: number | null;
    rateLimitWindow?: number | null;
    alertThreshold?: number;
  };
};

function usagePercent(used: number, limit: number | null | undefined) {
  if (!limit) return null;
  return Math.min(100, Math.round((used / limit) * 100));
}

function ProgressBar({ pct, threshold = 80 }: { pct: number; threshold?: number }) {
  const color = pct >= 100 ? "bg-red-500" : pct >= threshold ? "bg-amber-500" : "bg-teal-500";
  return (
    <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
      <div className={`h-2 rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

function EditQuotaModal({
  tenant,
  onClose,
  onSaved,
}: {
  tenant: TenantQuota;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [storageLimitMb, setStorageLimitMb] = useState(String(tenant.quota.storageLimitMb ?? ""));
  const [rateLimitMax, setRateLimitMax] = useState(String(tenant.quota.rateLimitMax ?? ""));
  const [rateLimitWindow, setRateLimitWindow] = useState(String(tenant.quota.rateLimitWindow ?? "60"));
  const [alertThreshold, setAlertThreshold] = useState(String(tenant.quota.alertThreshold ?? "80"));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await apiPatch(`/api/v1/platform/tenants/${tenant.tenantId}/quota`, {
        storageLimitMb: storageLimitMb ? Number(storageLimitMb) : null,
        rateLimitMax: rateLimitMax ? Number(rateLimitMax) : null,
        rateLimitWindow: rateLimitWindow ? Number(rateLimitWindow) : 60,
        alertThreshold: alertThreshold ? Number(alertThreshold) : 80,
      });
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to save quota");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-h3 text-primary">Edit Quota</h2>
          <p className="text-xs text-slate-500 mt-1">
            Agency: <span className="font-semibold">{tenant.tenantName}</span> ({tenant.tenantCode})
          </p>
        </div>
        <form onSubmit={(e) => void save(e)} className="p-6 space-y-4">
          {err && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-800 text-sm">{err}</div>}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Storage Limit (MB)</label>
            <input
              type="number"
              value={storageLimitMb}
              onChange={(e) => setStorageLimitMb(e.target.value)}
              placeholder="Unlimited"
              min={0}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <p className="text-xs text-slate-400 mt-1">Leave blank for unlimited</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Rate Limit (requests)</label>
              <input
                type="number"
                value={rateLimitMax}
                onChange={(e) => setRateLimitMax(e.target.value)}
                placeholder="Unlimited"
                min={0}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Per Window (sec)</label>
              <input
                type="number"
                value={rateLimitWindow}
                onChange={(e) => setRateLimitWindow(e.target.value)}
                min={1}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Alert Threshold (%)</label>
            <input
              type="number"
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(e.target.value)}
              min={1}
              max={100}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold">
              Cancel
            </button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm rounded-lg bg-teal-700 text-white font-semibold hover:bg-teal-800 transition-colors disabled:opacity-50">
              {saving ? "Saving…" : "Save Quota"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PlatformResourcesPage() {
  const [tenants, setTenants] = useState<TenantQuota[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editingTenant, setEditingTenant] = useState<TenantQuota | null>(null);
  const [search, setSearch] = useState("");

  const fetchAll = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = (await apiGet("/api/v1/platform/quotas", { signal })) as { success: boolean; data: { tenants: TenantQuota[] } };
      if (!signal?.aborted) setTenants(res.data?.tenants ?? []);
    } catch (e) {
      if (isAbortError(e) || signal?.aborted) return;
      setLoadError(e instanceof ApiError ? e.message : "Failed to load quotas");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void fetchAll(ac.signal);
    return () => ac.abort();
  }, [fetchAll]);

  const filtered = tenants.filter(
    (t) =>
      t.tenantName.toLowerCase().includes(search.toLowerCase()) ||
      t.tenantCode.toLowerCase().includes(search.toLowerCase())
  );

  // KPIs
  const atRisk = tenants.filter((t) => {
    const pct = usagePercent(t.quota.storageUsedMb ?? 0, t.quota.storageLimitMb);
    return pct !== null && pct >= (t.quota.alertThreshold ?? 80);
  }).length;

  return (
    <div className="p-gutter max-w-7xl mx-auto w-full pb-10">
      {editingTenant && (
        <EditQuotaModal
          tenant={editingTenant}
          onClose={() => setEditingTenant(null)}
          onSaved={() => void fetchAll()}
        />
      )}

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-slate-500 font-label-caps text-xs mb-2 flex-wrap">
          <span>Portal</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span>Platform</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">Resource Management</span>
        </div>
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="font-h1 text-primary">Resource Management</h1>
            <p className="font-body-md text-slate-600 mt-1">
              Monitor storage quotas and API rate limits per agency to prevent resource abuse.
            </p>
          </div>
          <Link
            to="/dashboard"
            className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold inline-flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-base">arrow_back</span>
            Dashboard
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Agencies", value: loading ? "…" : tenants.length, color: "text-teal-900" },
          { label: "At Risk (>80%)", value: loading ? "…" : atRisk, color: atRisk > 0 ? "text-amber-600" : "text-emerald-700" },
          {
            label: "Rate Limited",
            value: loading ? "…" : tenants.filter((t) => t.quota.rateLimitMax).length,
            color: "text-blue-700",
          },
          {
            label: "Unlimited Storage",
            value: loading ? "…" : tenants.filter((t) => !t.quota.storageLimitMb).length,
            color: "text-slate-600",
          },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {loadError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-sm mb-6">{loadError}</div>
      )}

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <span className="material-symbols-outlined text-slate-400">search</span>
          <input
            type="text"
            placeholder="Search agencies…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm outline-none text-slate-700 placeholder-slate-400 bg-transparent"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-widest">Agency</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-widest">Status</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-widest w-52">Storage Usage</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-widest">Rate Limit</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-widest">Alert At</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600 text-xs uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
                </td></tr>
              ) : filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-400">No agencies found</td></tr>
              ) : (
                filtered.map((t) => {
                  const pct = usagePercent(t.quota.storageUsedMb ?? 0, t.quota.storageLimitMb);
                  const threshold = t.quota.alertThreshold ?? 80;
                  const isAlert = pct !== null && pct >= threshold;
                  return (
                    <tr key={t.tenantId} className={`hover:bg-slate-50 transition-colors ${isAlert ? "bg-amber-50/30" : ""}`}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-slate-800">{t.tenantName}</p>
                        <p className="text-xs font-mono text-slate-500">{t.tenantCode}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                          t.isActive ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"
                        }`}>
                          {t.isActive ? "Active" : "Suspended"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {t.quota.storageLimitMb ? (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-600">
                              <span>{(t.quota.storageUsedMb ?? 0).toFixed(1)} MB used</span>
                              <span className={isAlert ? "text-amber-600 font-bold" : ""}>{pct}%</span>
                            </div>
                            <ProgressBar pct={pct ?? 0} threshold={threshold} />
                            <p className="text-xs text-slate-400">{t.quota.storageLimitMb} MB limit</p>
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">Unlimited</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-700">
                        {t.quota.rateLimitMax ? (
                          <span>{t.quota.rateLimitMax} req / {t.quota.rateLimitWindow ?? 60}s</span>
                        ) : (
                          <span className="text-slate-400 text-xs">Unlimited</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-slate-600">{threshold}%</td>
                      <td className="px-4 py-3 text-right">
                        <button
                          type="button"
                          onClick={() => setEditingTenant(t)}
                          className="text-xs font-semibold px-3 py-1 rounded text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                        >
                          Edit Quota
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
