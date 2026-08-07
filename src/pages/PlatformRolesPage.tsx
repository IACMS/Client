import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, apiDelete, apiGet, apiPatch, apiPost, isAbortError } from "@/lib/api";
import ConfirmDialog from "@/components/ConfirmDialog";

type Permission = { id: string; resource: string; action: string; description?: string };
type Role = {
  id: string;
  name: string;
  description?: string;
  isSystemRole: boolean;
  isActive: boolean;
  tenantId: string | null;
  createdAt: string;
  rolePermissions: { permission: Permission }[];
};

/* ── helpers ─────────────────────────────────────────────────────────────── */
function badgeClasses(role: Role) {
  if (role.isSystemRole) return "text-violet-700";
  if (!role.tenantId) return "text-blue-700";
  return "text-slate-600";
}
function roleBadgeLabel(role: Role, tenantsMap: Record<string, string>) {
  if (role.isSystemRole) return "System";
  if (!role.tenantId) return "Global";
  return tenantsMap[role.tenantId] || "Tenant";
}

/* ── Permission picker modal ─────────────────────────────────────────────── */
function PermissionsModal({
  role,
  allPermissions,
  onClose,
  onSaved,
}: {
  role: Role;
  allPermissions: Permission[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const currentIds = new Set(role.rolePermissions.map((rp) => rp.permission.id));
  const [selected, setSelected] = useState<Set<string>>(currentIds);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const save = async () => {
    setSaving(true);
    setErr(null);
    try {
      // Add new ones
      const toAdd = [...selected].filter((id) => !currentIds.has(id));
      const toRemove = [...currentIds].filter((id) => !selected.has(id));
      await Promise.all([
        ...toAdd.map((permissionId) =>
          apiPost(`/api/v1/rbac/role-permissions`, { roleId: role.id, permissionId })
        ),
        ...toRemove.map((permissionId) =>
          apiDelete(`/api/v1/rbac/role-permissions/${role.id}/${permissionId}`)
        ),
      ]);
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to save permissions");
    } finally {
      setSaving(false);
    }
  };

  // Group by resource
  const grouped = allPermissions.reduce<Record<string, Permission[]>>((acc, p) => {
    (acc[p.resource] ??= []).push(p);
    return acc;
  }, {});

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-xl border border-slate-200 max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-100 flex justify-between items-start shrink-0">
          <div>
            <h2 className="font-h3 text-primary">Edit Permissions</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Role: <span className="font-semibold">{role.name}</span>
            </p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="overflow-y-auto p-5 flex-1 space-y-5">
          {err && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-800 text-sm">{err}</div>
          )}
          {Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)).map(([resource, perms]) => (
            <div key={resource}>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">{resource}</p>
              <div className="space-y-1.5">
                {perms.map((p) => (
                  <label key={p.id} className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={selected.has(p.id)}
                      onChange={() => toggle(p.id)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                      disabled={role.isSystemRole}
                    />
                    <span className="text-sm font-mono text-slate-700 group-hover:text-teal-700 transition-colors">
                      {p.action}
                    </span>
                    {p.description && (
                      <span className="text-xs text-slate-400">{p.description}</span>
                    )}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="p-5 border-t border-slate-100 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
          >
            Cancel
          </button>
          {!role.isSystemRole && (
            <button
              type="button"
              disabled={saving}
              onClick={() => void save()}
              className="px-5 py-2 text-sm rounded-lg bg-teal-700 text-white font-semibold hover:bg-teal-800 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : "Save Permissions"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Create / Edit Role modal ────────────────────────────────────────────── */
function RoleFormModal({
  open,
  role,
  onClose,
  onSaved,
}: {
  open: boolean;
  role: Role | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setName(role?.name ?? "");
      setDescription(role?.description ?? "");
      setErr(null);
    }
  }, [open, role]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      if (role) {
        await apiPatch(`/api/v1/rbac/roles/${role.id}`, { name, description });
      } else {
        await apiPost(`/api/v1/rbac/roles`, { name, description });
      }
      onSaved();
      onClose();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to save role");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-h3 text-primary">{role ? "Edit Role" : "Create Role"}</h2>
          <p className="text-xs text-slate-500 mt-1">
            {role ? "Update role name and description." : "Create a new role to assign to users."}
          </p>
        </div>
        <form onSubmit={(e) => void submit(e)} className="p-6 space-y-4">
          {err && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-800 text-sm">{err}</div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="role-name">
              Role Name <span className="text-red-500">*</span>
            </label>
            <input
              id="role-name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="e.g. case_reviewer"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="role-desc">
              Description
            </label>
            <textarea
              id="role-desc"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              placeholder="What does this role allow?"
            />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2 text-sm rounded-lg bg-teal-700 text-white font-semibold hover:bg-teal-800 transition-colors disabled:opacity-50"
            >
              {saving ? "Saving…" : role ? "Save Changes" : "Create Role"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ── Main page ───────────────────────────────────────────────────────────── */
export default function PlatformRolesPage() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [tenantsMap, setTenantsMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterTenant, setFilterTenant] = useState("all");

  const [formOpen, setFormOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [permissionsRole, setPermissionsRole] = useState<Role | null>(null);
  const [deletingRole, setDeletingRole] = useState<Role | null>(null);

  const fetchAll = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const [rolesRes, permsRes, tenantsRes] = await Promise.all([
        apiGet("/api/v1/rbac/roles", { signal }) as Promise<{ roles: Role[] }>,
        apiGet("/api/v1/rbac/permissions", { signal }) as Promise<{ permissions: Permission[] }>,
        apiGet("/api/v1/tenants", { signal }) as Promise<{ tenants: { id: string; name: string }[] }>,
      ]);
      if (!signal?.aborted) {
        setRoles(rolesRes.roles ?? []);
        setPermissions(permsRes.permissions ?? []);
        const tmap: Record<string, string> = {};
        (tenantsRes.tenants ?? []).forEach((t) => { tmap[t.id] = t.name; });
        setTenantsMap(tmap);
      }
    } catch (e) {
      if (isAbortError(e) || signal?.aborted) return;
      setLoadError(e instanceof ApiError ? e.message : "Failed to load roles");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void fetchAll(ac.signal);
    return () => ac.abort();
  }, [fetchAll]);

  const handleDelete = async () => {
    if (!deletingRole) return;
    try {
      await apiDelete(`/api/v1/rbac/roles/${deletingRole.id}`);
      setDeletingRole(null);
      void fetchAll();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed to delete role");
      setDeletingRole(null);
    }
  };

  const filtered = roles.filter((r) => {
    if (filterType === "system" && !r.isSystemRole) return false;
    if (filterType === "global" && (r.isSystemRole || r.tenantId)) return false;
    if (filterType === "tenant" && (r.isSystemRole || !r.tenantId)) return false;

    if (filterTenant !== "all" && r.tenantId !== filterTenant) return false;

    if (!search) return true;
    const term = search.toLowerCase();
    const typeLabel = roleBadgeLabel(r, tenantsMap).toLowerCase();
    return (
      r.name.toLowerCase().includes(term) ||
      (r.description ?? "").toLowerCase().includes(term) ||
      typeLabel.includes(term)
    );
  });

  return (
    <div className="p-gutter max-w-7xl mx-auto w-full pb-10">
      <RoleFormModal
        open={formOpen}
        role={editingRole}
        onClose={() => { setFormOpen(false); setEditingRole(null); }}
        onSaved={() => void fetchAll()}
      />

      {permissionsRole && (
        <PermissionsModal
          role={permissionsRole}
          allPermissions={permissions}
          onClose={() => setPermissionsRole(null)}
          onSaved={() => void fetchAll()}
        />
      )}

      <ConfirmDialog
        open={!!deletingRole}
        title={`Delete role "${deletingRole?.name}"?`}
        message="All users with this role will lose it. This cannot be undone."
        confirmLabel="Delete Role"
        variant="danger"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeletingRole(null)}
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-slate-500 font-label-caps text-xs mb-2 flex-wrap">
          <span>Portal</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span>Platform</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">Roles & Permissions</span>
        </div>
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="font-h1 text-primary">Roles & Permissions</h1>
            <p className="font-body-md text-slate-600 mt-1">
              Manage roles and their associated permissions across the platform.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              to="/dashboard"
              className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold inline-flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">arrow_back</span>
              Dashboard
            </Link>
            <button
              type="button"
              onClick={() => { setEditingRole(null); setFormOpen(true); }}
              className="text-sm px-4 py-2 rounded-lg bg-teal-700 text-white hover:bg-teal-800 font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined text-base">add</span>
              New Role
            </button>
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Roles", value: loading ? "…" : roles.length, color: "text-teal-900" },
          { label: "System Roles", value: loading ? "…" : roles.filter((r) => r.isSystemRole).length, color: "text-violet-700" },
          { label: "Global Roles", value: loading ? "…" : roles.filter((r) => !r.tenantId && !r.isSystemRole).length, color: "text-blue-700" },
          { label: "Permissions", value: loading ? "…" : permissions.length, color: "text-slate-700" },
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

      {/* Filters */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-end">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1.5" htmlFor="pr-search">
              Search
            </label>
            <div className="relative">
              <span className="material-symbols-outlined text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 text-[18px]">search</span>
              <input
                id="pr-search"
                type="search"
                placeholder="Search by role name, description, or tenant name…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border border-slate-200 rounded-lg pl-9 pr-3 py-2 text-sm outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-shadow"
              />
            </div>
          </div>
          <div className="min-w-[160px]">
            <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1.5" htmlFor="pr-type">
              Role Type
            </label>
            <select
              id="pr-type"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-700 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-shadow"
            >
              <option value="all">All Types</option>
              <option value="system">System Roles</option>
              <option value="global">Global (No Tenant)</option>
              <option value="tenant">Tenant Specific</option>
            </select>
          </div>
          <div className="min-w-[200px]">
            <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1.5" htmlFor="pr-agency">
              Agency / Tenant
            </label>
            <select
              id="pr-agency"
              value={filterTenant}
              onChange={(e) => setFilterTenant(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white text-slate-700 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500 transition-shadow disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              disabled={filterType === "system" || filterType === "global"}
            >
              <option value="all">All Agencies</option>
              {Object.entries(tenantsMap)
                .sort(([, a], [, b]) => a.localeCompare(b))
                .map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead className="bg-slate-50 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-widest">Role</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-widest">Type</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-widest">Permissions</th>
                <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-widest">Created</th>
                <th className="px-4 py-3 text-right font-semibold text-slate-600 text-xs uppercase tracking-widest">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    {search ? `No roles matching "${search}"` : "No roles found"}
                  </td>
                </tr>
              ) : (
                filtered.map((role) => (
                  <tr key={role.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-800 font-mono text-sm">{role.name}</p>
                      {role.description && (
                        <p className="text-xs text-slate-500 mt-0.5 max-w-xs truncate">{role.description}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-bold ${badgeClasses(role)}`}>
                        {roleBadgeLabel(role, tenantsMap)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-slate-700">
                          {role.rolePermissions.length}
                        </span>
                        <button
                          type="button"
                          onClick={() => setPermissionsRole(role)}
                          className="text-xs text-teal-600 hover:underline font-medium"
                        >
                          {role.isSystemRole ? "View" : "Edit"}
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-[11px] font-mono text-slate-600">
                        {role.rolePermissions.slice(0, 3).map((rp, i) => (
                          <span key={rp.permission.id} className="flex items-center">
                            {i > 0 && <span className="text-slate-300 mr-2">•</span>}
                            <span>{rp.permission.resource}:{rp.permission.action}</span>
                          </span>
                        ))}
                        {role.rolePermissions.length > 3 && (
                          <span className="flex items-center">
                            <span className="text-slate-300 mr-2">•</span>
                            <span className="text-slate-400 italic">+{role.rolePermissions.length - 3} more</span>
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(role.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!role.isSystemRole ? (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => { setEditingRole(role); setFormOpen(true); }}
                            className="text-xs font-semibold px-3 py-1 rounded text-blue-700 bg-blue-50 hover:bg-blue-100 transition-colors"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingRole(role)}
                            className="text-xs font-semibold px-3 py-1 rounded text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400 italic">System role</span>
                      )}
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
