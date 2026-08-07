import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, apiGet, apiPatch, apiPost, isAbortError } from "@/lib/api";

type Settings = Record<string, string | boolean | number | null>;
type TenantFlagRow = {
  tenantId: string;
  tenantCode: string;
  tenantName: string;
  flags: Record<string, boolean>;
};
type FeatureFlagsData = {
  global: Record<string, boolean>;
  tenants: TenantFlagRow[];
};

const DEFAULT_SETTINGS_KEYS = [
  { key: "emailSenderAddress", label: "Email Sender Address", type: "text", placeholder: "noreply@platform.com" },
  { key: "emailSenderName", label: "Email Sender Name", type: "text", placeholder: "IACMS Platform" },
  { key: "maintenanceMode", label: "Maintenance Mode", type: "boolean", placeholder: "" },
  { key: "maxTenantsPerPlatform", label: "Max Tenants", type: "number", placeholder: "100" },
  { key: "supportEmail", label: "Support Email", type: "text", placeholder: "support@platform.com" },
  { key: "platformName", label: "Platform Name", type: "text", placeholder: "IACMS" },
];

const KNOWN_FLAGS = [
  "ai_chat_enabled",
  "referrals_enabled",
  "advanced_workflows",
  "file_uploads",
  "multi_department",
  "audit_export",
];

function SettingsTab({ settings, loading, onSave }: {
  settings: Settings;
  loading: boolean;
  onSave: (updates: Settings) => Promise<void>;
}) {
  const [form, setForm] = useState<Settings>({});
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => { setForm(settings); }, [settings]);

  const save = async () => {
    setSaving(true);
    setErr(null);
    setSuccess(false);
    try {
      await onSave(form);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const setValue = (key: string, value: string | boolean | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (loading) return <div className="py-10 text-center text-slate-400"><span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span></div>;

  return (
    <div className="space-y-6">
      {err && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-red-800 text-sm">{err}</div>}
      {success && <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-emerald-800 text-sm flex items-center gap-2"><span className="material-symbols-outlined text-base">check_circle</span>Settings saved successfully.</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {DEFAULT_SETTINGS_KEYS.map(({ key, label, type, placeholder }) => (
          <div key={key} className="bg-slate-50 rounded-xl p-4 border border-slate-200">
            <label className="block text-xs font-semibold text-slate-600 mb-2">{label}</label>
            {type === "boolean" ? (
              <button
                type="button"
                onClick={() => setValue(key, !form[key])}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form[key] ? "bg-teal-600" : "bg-slate-300"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${form[key] ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            ) : (
              <input
                type={type === "number" ? "number" : "text"}
                value={String(form[key] ?? "")}
                onChange={(e) => setValue(key, type === "number" ? Number(e.target.value) : e.target.value)}
                placeholder={placeholder}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-white"
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          className="px-6 py-2.5 text-sm rounded-lg bg-teal-700 text-white font-semibold hover:bg-teal-800 transition-colors disabled:opacity-50"
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}

function FeatureFlagsTab({ data, loading, onToggle }: {
  data: FeatureFlagsData | null;
  loading: boolean;
  onToggle: (key: string, enabled: boolean, tenantId?: string) => Promise<void>;
}) {
  const [toggling, setToggling] = useState<string | null>(null);
  const [newFlag, setNewFlag] = useState("");

  const toggle = async (key: string, current: boolean, tenantId?: string) => {
    const uid = `${key}-${tenantId ?? "global"}`;
    setToggling(uid);
    try { await onToggle(key, !current, tenantId); } finally { setToggling(null); }
  };

  if (loading) return <div className="py-10 text-center text-slate-400"><span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span></div>;

  const allFlagKeys = Array.from(new Set([
    ...KNOWN_FLAGS,
    ...Object.keys(data?.global ?? {}),
    ...(data?.tenants ?? []).flatMap((t) => Object.keys(t.flags)),
  ])).sort();

  return (
    <div className="space-y-6">
      {/* Global flags */}
      <div>
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Global Flags (apply to all agencies by default)</h3>
        <div className="bg-slate-50 rounded-xl border border-slate-200 divide-y divide-slate-200 overflow-hidden">
          {allFlagKeys.map((key) => {
            const enabled = !!(data?.global?.[key]);
            const uid = `${key}-global`;
            return (
              <div key={key} className="flex items-center justify-between px-4 py-3">
                <span className="text-sm font-mono text-slate-700">{key}</span>
                <button
                  type="button"
                  disabled={toggling === uid}
                  onClick={() => void toggle(key, enabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors disabled:opacity-50 ${enabled ? "bg-teal-600" : "bg-slate-300"}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add custom flag */}
      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="block text-xs font-semibold text-slate-600 mb-1">Add Custom Flag Key</label>
          <input
            type="text"
            value={newFlag}
            onChange={(e) => setNewFlag(e.target.value.replace(/\s/g, "_").toLowerCase())}
            placeholder="e.g. beta_feature_x"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
        <button
          type="button"
          disabled={!newFlag.trim()}
          onClick={() => { void toggle(newFlag.trim(), false); setNewFlag(""); }}
          className="px-4 py-2 text-sm rounded-lg bg-slate-700 text-white font-semibold hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          Add Flag
        </button>
      </div>

      {/* Per-tenant overrides */}
      {(data?.tenants ?? []).length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Per-Agency Overrides</h3>
          <div className="overflow-x-auto bg-white border border-slate-200 rounded-xl">
            <table className="w-full text-xs min-w-[600px]">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2 text-left font-semibold text-slate-600 uppercase tracking-widest">Agency</th>
                  {allFlagKeys.map((k) => (
                    <th key={k} className="px-3 py-2 font-mono text-slate-500 text-center">{k}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data?.tenants ?? []).map((t) => (
                  <tr key={t.tenantId} className="hover:bg-slate-50">
                    <td className="px-4 py-2">
                      <p className="font-semibold text-slate-700">{t.tenantName}</p>
                      <p className="text-slate-400 font-mono">{t.tenantCode}</p>
                    </td>
                    {allFlagKeys.map((k) => {
                      const enabled = !!(t.flags?.[k]);
                      const inherited = !(k in (t.flags ?? {}));
                      const uid = `${k}-${t.tenantId}`;
                      return (
                        <td key={k} className="px-3 py-2 text-center">
                          <button
                            type="button"
                            disabled={toggling === uid}
                            onClick={() => void toggle(k, enabled, t.tenantId)}
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors disabled:opacity-50 ${enabled ? "bg-teal-500" : inherited ? "bg-slate-200 opacity-50" : "bg-slate-300"}`}
                            title={inherited ? "Using global default" : ""}
                          >
                            <span className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${enabled ? "translate-x-4" : "translate-x-0.5"}`} />
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PlatformSettingsPage() {
  const [activeTab, setActiveTab] = useState<"settings" | "flags">("settings");
  const [settings, setSettings] = useState<Settings>({});
  const [flagsData, setFlagsData] = useState<FeatureFlagsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchAll = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const [settingsRes, flagsRes] = await Promise.all([
        apiGet("/api/v1/platform/settings", { signal }) as Promise<{ success: boolean; data: { settings: Settings } }>,
        apiGet("/api/v1/platform/feature-flags", { signal }) as Promise<{ success: boolean; data: FeatureFlagsData }>,
      ]);
      if (!signal?.aborted) {
        setSettings(settingsRes.data?.settings ?? {});
        setFlagsData(flagsRes.data ?? null);
      }
    } catch (e) {
      if (isAbortError(e) || signal?.aborted) return;
      setLoadError(e instanceof ApiError ? e.message : "Failed to load platform settings");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void fetchAll(ac.signal);
    return () => ac.abort();
  }, [fetchAll]);

  const handleSaveSettings = async (updates: Settings) => {
    await apiPatch("/api/v1/platform/settings", updates);
    setSettings(updates);
  };

  const handleToggleFlag = async (key: string, enabled: boolean, tenantId?: string) => {
    await apiPost("/api/v1/platform/feature-flags", { key, enabled, tenantId: tenantId ?? null });
    void fetchAll();
  };

  return (
    <div className="p-gutter max-w-7xl mx-auto w-full pb-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-slate-500 font-label-caps text-xs mb-2 flex-wrap">
          <span>Portal</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span>Platform</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">Configuration</span>
        </div>
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="font-h1 text-primary">Configuration & Feature Flags</h1>
            <p className="font-body-md text-slate-600 mt-1">
              Manage platform-wide settings and toggle features per agency without redeploying.
            </p>
          </div>
          <Link to="/dashboard" className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-base">arrow_back</span>Dashboard
          </Link>
        </div>
      </div>

      {loadError && <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-sm mb-6">{loadError}</div>}

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-1">
        {(["settings", "flags"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab === "settings" ? (
              <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-base">tune</span>Global Settings</span>
            ) : (
              <span className="flex items-center gap-1.5"><span className="material-symbols-outlined text-base">toggle_on</span>Feature Flags</span>
            )}
          </button>
        ))}
      </div>

      {activeTab === "settings" && (
        <SettingsTab settings={settings} loading={loading} onSave={handleSaveSettings} />
      )}
      {activeTab === "flags" && (
        <FeatureFlagsTab data={flagsData} loading={loading} onToggle={handleToggleFlag} />
      )}
    </div>
  );
}
