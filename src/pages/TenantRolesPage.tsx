import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiGet, apiPost, apiPut, apiPatch, ApiError } from "@/lib/api";
import { useSession } from "@/context/SessionContext";

type RolePermission = {
  permission: {
    id: string;
    resource: string;
    action: string;
    description: string | null;
  };
};

type Role = {
  id: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  tenantId: string | null;
  rolePermissions?: RolePermission[];
};

type PermissionItem = {
  id: string;
  resource: string;
  action: string;
  description: string | null;
};

type TenantUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: { id: string; name: string } | null;
};

export default function TenantRolesPage() {
  const { t } = useTranslation();
  const { user } = useSession();
  const tenantId = user?.tenantId;

  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [users, setUsers] = useState<TenantUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [createOpen, setCreateOpen] = useState(false);
  const [roleName, setRoleName] = useState("");
  const [roleDesc, setRoleDesc] = useState("");
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [editRole, setEditRole] = useState<Role | null>(null);
  const [assignUserModal, setAssignUserModal] = useState<TenantUser | null>(null);
  const [assignedRoleId, setAssignedRoleId] = useState<string>("");

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesRes, permsRes, usersRes] = await Promise.all([
        apiGet(`/api/v1/auth/roles?tenantId=${encodeURIComponent(tenantId ?? "")}`) as Promise<{ roles: Role[] }>,
        apiGet(`/api/v1/auth/permissions`) as Promise<{ permissions: PermissionItem[] }>,
        apiGet(`/api/v1/auth/users`) as Promise<{ users: TenantUser[] }>,
      ]);
      setRoles(rolesRes.roles || []);
      setPermissions(permsRes.permissions || []);
      setUsers(usersRes.users || []);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Failed to load roles and permissions.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tenantId) void fetchData();
  }, [tenantId]);

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleName.trim()) return;
    setSaving(true);
    try {
      await apiPost("/api/v1/auth/roles", {
        name: roleName.trim(),
        description: roleDesc.trim() || null,
        tenantId,
        permissionIds: selectedPermIds,
      });
      setCreateOpen(false);
      setRoleName("");
      setRoleDesc("");
      setSelectedPermIds([]);
      await fetchData();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed to create role");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateRolePerms = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editRole) return;
    setSaving(true);
    try {
      await apiPut(`/api/v1/auth/roles/${editRole.id}`, {
        name: editRole.name,
        description: editRole.description,
        permissionIds: selectedPermIds,
      });
      setEditRole(null);
      await fetchData();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed to update role permissions");
    } finally {
      setSaving(false);
    }
  };

  const handleAssignRole = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignUserModal || !assignedRoleId) return;
    setSaving(true);
    try {
      await apiPatch(`/api/v1/auth/users/${assignUserModal.id}/role`, {
        roleId: assignedRoleId,
      });
      setAssignUserModal(null);
      await fetchData();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed to assign role to user");
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (r: Role) => {
    setEditRole(r);
    const existingPermIds = r.rolePermissions?.map((rp) => rp.permission.id) || [];
    setSelectedPermIds(existingPermIds);
  };

  const togglePermission = (id: string) => {
    setSelectedPermIds((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  // Group permissions by resource (excluding platform permissions which are reserved for system admins)
  const groupedPerms = permissions
    .filter((p) => p.resource !== "platform")
    .reduce<Record<string, PermissionItem[]>>((acc, p) => {
      acc[p.resource] = acc[p.resource] || [];
      acc[p.resource].push(p);
      return acc;
    }, {});

  return (
    <div className="p-gutter max-w-7xl mx-auto w-full pb-12 space-y-8">
      <div className="flex justify-between items-end flex-wrap gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>{t("portal.breadcrumb.portal")}</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-teal-600 font-bold">Tenant Settings</span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Roles & Permissions Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage custom organizational roles and configure fine-grained permissions for users within your tenant.
          </p>
        </div>
        <button
          onClick={() => {
            setSelectedPermIds([]);
            setRoleName("");
            setRoleDesc("");
            setCreateOpen(true);
          }}
          className="px-4 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm transition-all"
        >
          <span className="material-symbols-outlined text-base">add_moderator</span>
          Create Tenant Role
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
          <span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span>
          <span className="text-sm">Loading tenant roles...</span>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* ── Left 2 Cols: Roles & Permission Matrix ── */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-600">shield_person</span>
              Tenant Roles & Active Permissions
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {roles.map((r) => {
                const permCount = r.rolePermissions?.length || 0;
                const isTenantCustom = Boolean(r.tenantId);

                return (
                  <div
                    key={r.id}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                            {r.name.replace("_", " ")}
                            {isTenantCustom ? (
                              <span className="px-2 py-0.5 bg-teal-50 text-teal-700 rounded-full text-[10px] font-bold uppercase tracking-wider">
                                Custom
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full text-[10px] font-semibold uppercase tracking-wider">
                                System Default
                              </span>
                            )}
                          </h3>
                          <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                            {r.description || "Organizational role assignment."}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">
                          {permCount} {permCount === 1 ? "Permission" : "Permissions"} Granted
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {users.filter((u) => u.role?.id === r.id).length} Users Assigned
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 flex gap-2 pt-3 border-t border-slate-100">
                      <button
                        onClick={() => openEditModal(r)}
                        className="flex-1 py-1.5 px-3 bg-slate-50 hover:bg-teal-50 text-slate-700 hover:text-teal-700 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
                      >
                        <span className="material-symbols-outlined text-sm">tune</span>
                        Configure Permissions
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── Right Col: Users & Assigned Roles ── */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <span className="material-symbols-outlined text-teal-600">group</span>
              Tenant Staff & Assigned Roles
            </h2>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {users.map((u) => (
                <div key={u.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-xs text-slate-800 truncate">
                      {u.firstName} {u.lastName}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">{u.email}</p>
                    <span className="inline-block mt-1 text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700 capitalize">
                      {u.role ? u.role.name.replace("_", " ") : "No Role Assigned"}
                    </span>
                  </div>

                  <button
                    onClick={() => {
                      setAssignUserModal(u);
                      setAssignedRoleId(u.role?.id || "");
                    }}
                    className="p-1.5 text-slate-500 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors shrink-0"
                    title="Change Role"
                  >
                    <span className="material-symbols-outlined text-base">edit_square</span>
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Create Role Modal ── */}
      {createOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600">add_moderator</span>
                Create Custom Tenant Role
              </h3>
              <button onClick={() => setCreateOpen(false)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Role Name *
                </label>
                <input
                  type="text"
                  required
                  value={roleName}
                  onChange={(e) => setRoleName(e.target.value)}
                  placeholder="e.g. Legal Specialist"
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={roleDesc}
                  onChange={(e) => setRoleDesc(e.target.value)}
                  placeholder="Responsibilities and purpose of this role..."
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Allowed Permissions
                </label>
                <div className="space-y-4 max-h-60 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                  {Object.entries(groupedPerms).map(([resource, permGroup]) => (
                    <div key={resource} className="space-y-1.5">
                      <span className="text-[11px] font-extrabold text-teal-700 uppercase tracking-wider block">
                        {resource}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {permGroup.map((p) => (
                          <label
                            key={p.id}
                            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-xs text-slate-700 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermIds.includes(p.id)}
                              onChange={() => togglePermission(p.id)}
                              className="rounded text-teal-600 focus:ring-teal-500"
                            />
                            <span>{p.action}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Edit Role Permissions Modal ── */}
      {editRole && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600">tune</span>
                Configure Permissions: {editRole.name.replace("_", " ")}
              </h3>
              <button onClick={() => setEditRole(null)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleUpdateRolePerms} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Check/Uncheck Permissions
                </label>
                <div className="space-y-4 max-h-72 overflow-y-auto border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                  {Object.entries(groupedPerms).map(([resource, permGroup]) => (
                    <div key={resource} className="space-y-1.5">
                      <span className="text-[11px] font-extrabold text-teal-700 uppercase tracking-wider block">
                        {resource}
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        {permGroup.map((p) => (
                          <label
                            key={p.id}
                            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 text-xs text-slate-700 cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermIds.includes(p.id)}
                              onChange={() => togglePermission(p.id)}
                              className="rounded text-teal-600 focus:ring-teal-500"
                            />
                            <span>{p.action}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEditRole(null)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Permission Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Assign User Role Modal ── */}
      {assignUserModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600">manage_accounts</span>
                Assign Role to {assignUserModal.firstName} {assignUserModal.lastName}
              </h3>
              <button onClick={() => setAssignUserModal(null)} className="text-slate-400 hover:text-slate-600">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleAssignRole} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Select Role
                </label>
                <select
                  value={assignedRoleId}
                  onChange={(e) => setAssignedRoleId(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="">-- Select Role --</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name.replace("_", " ")} {r.tenantId ? "(Custom)" : "(System Default)"}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAssignUserModal(null)}
                  className="flex-1 py-2.5 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !assignedRoleId}
                  className="flex-1 py-2.5 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold shadow-sm disabled:opacity-50"
                >
                  {saving ? "Updating..." : "Assign Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
