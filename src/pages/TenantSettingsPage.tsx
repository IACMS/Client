import { useEffect, useState } from "react";
import { useSession } from "@/context/SessionContext";
import { apiFetch, apiGet, apiPatch, getApiBase } from "@/lib/api";

type TenantConfig = {
  primaryColor?: string;
  secondaryColor?: string;
  logoUrl?: string;
  fontPreference?: string;
};

function getBrandingEditability(user: unknown): { canEdit: boolean; hasAuthSignal: boolean } {
  if (!user || typeof user !== "object") return { canEdit: false, hasAuthSignal: true };
  const u = user as Record<string, unknown>;

  const hasFlagSignal = u.isSystemAdmin != null || u.isTenantAdmin != null;
  if (u.isSystemAdmin === true || u.isTenantAdmin === true) return { canEdit: true, hasAuthSignal: true };
  if (hasFlagSignal) return { canEdit: false, hasAuthSignal: true };

  const role = u.role;
  const roleName =
    (role && typeof role === "object" ? (role as Record<string, unknown>).name : null) ??
    u.roleName ??
    u.role;

  if (typeof roleName === "string" && roleName.trim()) {
    const ok =
      /(^|[^a-z])system[_\s-]?admin([^a-z]|$)/i.test(roleName) ||
      /(^|[^a-z])tenant[_\s-]?admin([^a-z]|$)/i.test(roleName);
    return { canEdit: ok, hasAuthSignal: true };
  }

  // We don't have reliable role info in the session payload. Allow UI edits and rely on backend 403.
  return { canEdit: true, hasAuthSignal: false };
}

export default function TenantSettingsPage() {
  const { user, refresh } = useSession();
  const [config, setConfig] = useState<TenantConfig>({
    primaryColor: "#0f766e", // Default teal-700
    secondaryColor: "#115e59",
    logoUrl: "",
    fontPreference: "Inter",
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const { canEdit, hasAuthSignal } = getBrandingEditability(user);
  const settingsTenantId = user?.tenant?.id ?? user?.tenantId;
  const apiBase = getApiBase();
  const resolvedLogoUrl =
    config.logoUrl && config.logoUrl.startsWith("/") ? `${apiBase}${config.logoUrl}` : (config.logoUrl ?? "");

  useEffect(() => {
    if (!settingsTenantId) return;
    setLoading(true);
    apiGet(`/api/v1/tenants/${settingsTenantId}`)
      .then((data: any) => {
        if (data.tenant?.config) {
          setConfig(prev => ({ ...prev, ...data.tenant.config }));
        }
      })
      .catch(() => setErrorMsg("Failed to load tenant configuration."))
      .finally(() => setLoading(false));
  }, [settingsTenantId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsTenantId) return;
    if (hasAuthSignal && !canEdit) {
      setErrorMsg("You do not have permission to edit tenant branding.");
      return;
    }
    setSaving(true);
    setErrorMsg("");
    setSuccessMsg("");
    try {
      // Optional: upload a new logo asset first (backend expected to return { logoUrl } or { url }).
      let nextConfig = config;
      if (logoFile) {
        const fd = new FormData();
        fd.append("file", logoFile);
        const up = (await apiFetch(`/api/v1/tenants/${settingsTenantId}/logo`, { method: "POST", body: fd })) as
          | { logoUrl?: string; url?: string }
          | null;
        const url = up?.logoUrl ?? up?.url;
        if (typeof url === "string" && url) {
          nextConfig = { ...nextConfig, logoUrl: url };
          setConfig(nextConfig);
        }
      }
      // Backend validator expects an absolute URL for logoUrl; uploaded logos currently come back as a relative path.
      const payloadConfig: TenantConfig = {
        ...nextConfig,
        logoUrl:
          typeof nextConfig.logoUrl === "string" && nextConfig.logoUrl.startsWith("/")
            ? `${apiBase}${nextConfig.logoUrl}`
            : nextConfig.logoUrl,
      };
      await apiPatch(`/api/v1/tenants/${settingsTenantId}/config`, { config: payloadConfig });
      setSuccessMsg("Configuration saved successfully! The UI will update shortly.");
      // Apply theme locally immediately
      if (nextConfig.primaryColor) document.documentElement.style.setProperty("--iacms-primary", nextConfig.primaryColor);
      if (nextConfig.secondaryColor) document.documentElement.style.setProperty("--iacms-secondary", nextConfig.secondaryColor);
      await refresh(); // Refresh session to get updated tenant config
      setLogoFile(null);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to save configuration.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 p-lg max-w-4xl w-full mx-auto pb-10 flex justify-center items-center h-[50vh]">
        <span className="material-symbols-outlined animate-spin text-4xl text-slate-400">sync</span>
      </div>
    );
  }

  return (
    <div className="p-gutter max-w-4xl mx-auto w-full pb-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-slate-500 font-label-caps text-xs mb-2 flex-wrap">
          <span>SETTINGS</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">PORTAL CUSTOMIZATION</span>
        </div>
        <h1 className="font-h1 text-primary">Portal Customization</h1>
        <p className="font-body-md text-slate-600 mt-1">
          Customize the look and feel of your organization's IACMS workspace.
        </p>
      </div>

      {hasAuthSignal && !canEdit && (
        <div className="mb-6 p-4 bg-amber-50 text-amber-900 rounded-lg border border-amber-200 flex items-start gap-2">
          <span className="material-symbols-outlined mt-0.5">lock</span>
          <div>
            <p className="font-semibold">Read-only</p>
            <p className="text-sm text-amber-900/80">
              Only the system admin or tenant admin can change portal branding for this tenant.
            </p>
          </div>
        </div>
      )}

      {!hasAuthSignal && (
        <div className="mb-6 p-4 bg-slate-50 text-slate-800 rounded-lg border border-slate-200 flex items-start gap-2">
          <span className="material-symbols-outlined mt-0.5">info</span>
          <div>
            <p className="font-semibold">Admin check not available</p>
            <p className="text-sm text-slate-700/80">
              Your session payload doesn’t include role/admin fields, so the UI can’t reliably tell if you’re an admin.
              You can edit here, and the backend will enforce permissions.
            </p>
          </div>
        </div>
      )}

      {successMsg && (
        <div className="mb-6 p-4 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 flex items-center gap-2">
          <span className="material-symbols-outlined">check_circle</span>
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="mb-6 p-4 bg-red-50 text-red-800 rounded-lg border border-red-200 flex items-center gap-2">
          <span className="material-symbols-outlined">error</span>
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
        <div className="p-6 border-b border-outline-variant bg-slate-50">
          <h2 className="font-h3 text-slate-800">Brand Identity</h2>
          <p className="text-sm text-slate-500 mt-1">These settings affect how your users see the portal.</p>
        </div>

        <div className="p-6 space-y-8">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Organization Logo URL</label>
            <input
              type="url"
              value={config.logoUrl || ""}
              onChange={e => setConfig({ ...config, logoUrl: e.target.value })}
              disabled={!canEdit}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="https://example.com/logo.png"
            />
            <div className="mt-3">
              <label className="block text-xs font-label-caps text-slate-500 mb-1 uppercase">Or upload a logo</label>
              <input
                type="file"
                accept="image/*"
                disabled={!canEdit}
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                className="block w-full text-sm text-slate-700 file:mr-4 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
              />
              <p className="text-xs text-slate-500 mt-1">Upload requires backend support at <span className="font-mono">POST /api/v1/tenants/:id/logo</span>.</p>
            </div>
            {resolvedLogoUrl && (
              <div className="mt-4 p-4 border border-slate-200 rounded-lg bg-slate-50 inline-block">
                <p className="text-xs font-label-caps text-slate-500 mb-2">PREVIEW</p>
                <img
                  src={resolvedLogoUrl}
                  alt="Logo Preview"
                  className="h-12 object-contain"
                  onError={(e) => (e.currentTarget.style.display = "none")}
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Primary Color</label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={config.primaryColor || "#0f766e"}
                  onChange={e => setConfig({ ...config, primaryColor: e.target.value })}
                  disabled={!canEdit}
                  className="h-10 w-16 p-1 border border-slate-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={config.primaryColor || ""}
                  onChange={e => setConfig({ ...config, primaryColor: e.target.value })}
                  disabled={!canEdit}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-300 font-mono text-sm uppercase"
                  placeholder="#0F766E"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">Secondary Color</label>
              <div className="flex gap-3 items-center">
                <input
                  type="color"
                  value={config.secondaryColor || "#115e59"}
                  onChange={e => setConfig({ ...config, secondaryColor: e.target.value })}
                  disabled={!canEdit}
                  className="h-10 w-16 p-1 border border-slate-300 rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={config.secondaryColor || ""}
                  onChange={e => setConfig({ ...config, secondaryColor: e.target.value })}
                  disabled={!canEdit}
                  className="flex-1 px-4 py-2 rounded-lg border border-slate-300 font-mono text-sm uppercase"
                  placeholder="#115E59"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Font Preference</label>
            <select
              value={config.fontPreference || "Inter"}
              onChange={e => setConfig({ ...config, fontPreference: e.target.value })}
              disabled={!canEdit}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
            >
              <option value="Inter">Inter (Default)</option>
              <option value="Roboto">Roboto</option>
              <option value="Outfit">Outfit</option>
              <option value="system-ui">System Default</option>
            </select>
          </div>
        </div>

        <div className="p-6 border-t border-outline-variant bg-slate-50 flex justify-end gap-3">
          <button
            type="button"
            className="px-6 py-2.5 rounded-lg font-semibold text-slate-600 hover:bg-slate-200 transition-colors"
            disabled={hasAuthSignal && !canEdit}
          >
            Reset
          </button>
          <button
            type="submit"
            disabled={saving || (hasAuthSignal && !canEdit)}
            className="px-6 py-2.5 rounded-lg font-semibold bg-primary text-white hover:bg-primary transition-colors flex items-center gap-2 disabled:opacity-70"
          >
            {saving ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
            ) : (
              <span className="material-symbols-outlined text-[20px]">save</span>
            )}
            Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
