import { useEffect, useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { apiGet, apiPatch, apiDelete } from "@/lib/api";
import CreateUserModal from "@/components/CreateUserModal";
import EditUserModal from "@/components/EditUserModal";
import ConfirmDialog from "@/components/ConfirmDialog";
import { usePermissions } from "@/permissions/usePermissions";

type ApiUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  departmentId?: string | null;
  department?: { id: string; code?: string; name?: string } | null;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  role: { id: string; name: string } | null;
};

type UsersResponse = { users?: ApiUser[] };

const PAGE_SIZE = 50;

export default function UsersPage() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ok" | "error">(
    "loading",
  );
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { can } = usePermissions();
  const canInvite = can("users:create");
  const canEdit = can("users:update");
  const canDelete = can("users:delete");
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState<ApiUser | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [filters, setFilters] = useState({ search: "", role: "", status: "" });
  const [applied, setApplied] = useState({ search: "", role: "", status: "" });

  const [sortBy, setSortBy] = useState<"name" | "role" | "department" | "status" | "lastLogin">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(0);

  const fetchUsers = async () => {
    setLoadState("loading");
    try {
      const data = (await apiGet(`/api/v1/auth/users`)) as UsersResponse;
      setUsers(data.users || []);
      setLoadState("ok");
    } catch (e) {
      setLoadState("error");
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleActive = async (u: ApiUser) => {
    if (togglingId) return;
    setTogglingId(u.id);
    try {
      const endpoint = u.isActive ? `/api/v1/auth/users/${u.id}/deactivate` : `/api/v1/auth/users/${u.id}/reactivate`;
      await apiPatch(endpoint, {});
      void fetchUsers();
    } catch (e: any) {
      alert(e.message || "Failed to update user status");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeleteConfirmed = async () => {
    if (!deletingUser) return;
    try {
      await apiDelete(`/api/v1/auth/users/${deletingUser.id}`);
      setDeletingUser(null);
      void fetchUsers();
    } catch (e: any) {
      alert(e.message || "Failed to delete user");
      setDeletingUser(null);
    }
  };

  const availableRoles = useMemo(() => {
    const roles = new Set<string>();
    users.forEach((u) => {
      if (u.role?.name) roles.add(u.role.name);
    });
    return Array.from(roles);
  }, [users]);

  const processedUsers = useMemo(() => {
    let result = [...users];

    if (applied.search) {
      const q = applied.search.toLowerCase();
      result = result.filter(
        (u) =>
          u.firstName.toLowerCase().includes(q) ||
          u.lastName.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q)
      );
    }
    if (applied.role) {
      result = result.filter((u) => u.role?.name === applied.role);
    }
    if (applied.status) {
      const isActive = applied.status === "active";
      result = result.filter((u) => u.isActive === isActive);
    }

    result.sort((a, b) => {
      let valA: any = "";
      let valB: any = "";
      
      switch (sortBy) {
        case "name":
          valA = `${a.firstName} ${a.lastName}`.toLowerCase();
          valB = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case "role":
          valA = a.role?.name || "";
          valB = b.role?.name || "";
          break;
        case "department":
          valA = a.department?.name || "";
          valB = b.department?.name || "";
          break;
        case "status":
          valA = a.isActive ? 1 : 0;
          valB = b.isActive ? 1 : 0;
          break;
        case "lastLogin":
          valA = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
          valB = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
          break;
      }
      if (valA < valB) return sortDir === "asc" ? -1 : 1;
      if (valA > valB) return sortDir === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [users, applied, sortBy, sortDir]);

  const totalPages = Math.max(1, Math.ceil(processedUsers.length / PAGE_SIZE));
  const paginatedUsers = processedUsers.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  function goToPage(nextPage: number) {
    setPage(Math.max(0, Math.min(nextPage, totalPages - 1)));
  }

  function applyFilters() {
    setApplied(filters);
    setPage(0);
  }

  function clearFilters() {
    setFilters({ search: "", role: "", status: "" });
    setApplied({ search: "", role: "", status: "" });
    setPage(0);
  }

  function toggleSort(column: typeof sortBy) {
    if (sortBy === column && sortDir === "desc") {
      setSortDir("asc");
    } else if (sortBy === column) {
      setSortDir("desc");
    } else {
      setSortBy(column);
      setSortDir("asc");
    }
  }

  function sortIndicator(column: typeof sortBy) {
    if (sortBy !== column) return null;
    return sortDir === "asc" ? " ↑" : " ↓";
  }

  return (
    <div className="p-gutter max-w-7xl mx-auto w-full pb-10">
      <div className="mb-8 flex justify-between items-end flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 font-label-caps text-xs mb-2 flex-wrap">
            <span>{t("portal.breadcrumb.portal")}</span>
            <span className="material-symbols-outlined text-xs">
              chevron_right
            </span>
            <span className="text-primary font-bold">
              {t("portal.breadcrumb.users")}
            </span>
          </div>
          <h1 className="font-h1 text-primary">{t("users.title")}</h1>
          <p className="font-body-md text-slate-600 mt-1">
            {t("users.subtitle")}
          </p>
        </div>
        {canInvite && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-primary-container transition-all shadow-sm"
          >
            <span className="material-symbols-outlined">person_add</span>
            {t("users.invite")}
          </button>
        )}
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: "Total Users", value: loadState === "ok" ? users.length : "…", color: "text-teal-900" },
          { label: "Active", value: loadState === "ok" ? users.filter(u => u.isActive).length : "…", color: "text-emerald-700" },
          { label: "Showing", value: loadState === "ok" ? paginatedUsers.length : "…", color: "text-slate-700" },
          { label: "Page", value: loadState === "ok" ? `${page + 1} / ${totalPages}` : "…", color: "text-slate-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{s.label}</p>
            <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-outline-variant rounded-xl shadow-sm p-4 mb-4 space-y-4">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[200px]">
            <label
              className="block text-[10px] font-label-caps text-slate-500 mb-1"
              htmlFor="users-search"
            >
              {t("users.search.label", "Search")}
            </label>
            <input
              id="users-search"
              type="search"
              placeholder={t("users.search.placeholder", "Search by name or email...")}
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
            />
          </div>
          <div className="min-w-[140px]">
            <label
              className="block text-[10px] font-label-caps text-slate-500 mb-1"
              htmlFor="users-role"
            >
              {t("users.role.label", "Role")}
            </label>
            <select
              id="users-role"
              value={filters.role}
              onChange={(e) => setFilters({ ...filters, role: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">{t("users.role.all", "All Roles")}</option>
              {availableRoles.map((r) => (
                <option key={r} value={r}>
                  {r.replace("_", " ")}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[140px]">
            <label
              className="block text-[10px] font-label-caps text-slate-500 mb-1"
              htmlFor="users-status"
            >
              {t("users.status.label", "Status")}
            </label>
            <select
              id="users-status"
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">{t("users.status.all", "All Statuses")}</option>
              <option value="active">{t("users.status.active", "Active")}</option>
              <option value="inactive">{t("users.status.inactive", "Inactive")}</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 justify-between items-center pt-1 border-t border-slate-100">
          <p className="text-xs text-slate-500">
            {loadState === "ok" ? (
              <>
                Showing {paginatedUsers.length} of {processedUsers.length} users
                {applied.search ? ` matching "${applied.search}"` : ""}
              </>
            ) : (
              "Apply filters to view users"
            )}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={clearFilters}
              className="px-3 py-2 text-xs font-semibold border border-slate-200 rounded-lg hover:bg-slate-50"
            >
              {t("common.clear", "Clear")}
            </button>
            <button
              type="button"
              onClick={applyFilters}
              className="px-4 py-2 text-xs font-semibold bg-primary text-white rounded-lg hover:bg-primary-container"
            >
              {t("common.apply", "Apply Filters")}
            </button>
          </div>
        </div>
      </div>

      {loadState === "loading" && (
        <div className="p-12 text-center text-slate-500">
          <span className="material-symbols-outlined animate-spin text-3xl">
            sync
          </span>
        </div>
      )}

      {loadState === "error" && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">
          {t("users.loadFailed")}
        </div>
      )}

      {loadState === "ok" && (
        <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-outline-variant text-label-caps text-slate-500">
                  <th className="p-4 font-semibold">
                    <SortHeader
                      label={t("users.table.user")}
                      active={sortIndicator("name")}
                      onClick={() => toggleSort("name")}
                    />
                  </th>
                  <th className="p-4 font-semibold">
                    <SortHeader
                      label={t("users.table.role")}
                      active={sortIndicator("role")}
                      onClick={() => toggleSort("role")}
                    />
                  </th>
                  <th className="p-4 font-semibold">
                    <SortHeader
                      label="Department"
                      active={sortIndicator("department")}
                      onClick={() => toggleSort("department")}
                    />
                  </th>
                  <th className="p-4 font-semibold">
                    <SortHeader
                      label={t("users.table.status")}
                      active={sortIndicator("status")}
                      onClick={() => toggleSort("status")}
                    />
                  </th>
                  <th className="p-4 font-semibold">
                    <SortHeader
                      label={t("users.table.lastLogin")}
                      active={sortIndicator("lastLogin")}
                      onClick={() => toggleSort("lastLogin")}
                    />
                  </th>
                  {(canEdit || canDelete) && (
                    <th className="p-4 font-semibold text-right">
                      {t("users.table.actions")}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {paginatedUsers.map((u) => (
                  <tr
                    key={u.id}
                    className="hover:bg-slate-50/50 transition-colors"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm shrink-0">
                          {u.firstName.charAt(0)}
                          {u.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {u.firstName} {u.lastName}
                          </p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span className="text-sm font-medium text-slate-700 capitalize">
                        {u.role
                          ? u.role.name.replace("_", " ")
                          : t("users.roleNone")}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-600">
                      {u.department?.name ?? "—"}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs font-bold ${u.isActive ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800"}`}
                      >
                        {u.isActive
                          ? t("users.status.active")
                          : t("users.status.inactive")}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-slate-500">
                      {u.lastLogin
                        ? new Date(u.lastLogin).toLocaleDateString()
                        : t("users.lastLoginNever")}
                    </td>
                    {(canEdit || canDelete) && (
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-3">
                          {canEdit && (
                            <>
                              <button
                                className="text-primary hover:text-primary text-sm font-semibold"
                                onClick={() => setEditUserId(u.id)}
                              >
                                {t("users.edit")}
                              </button>
                              <button
                                disabled={togglingId === u.id}
                                className={`text-sm font-semibold transition-colors disabled:opacity-50 ${
                                  u.isActive ? "text-amber-600 hover:text-amber-700" : "text-emerald-600 hover:text-emerald-700"
                                }`}
                                onClick={() => void handleToggleActive(u)}
                              >
                                {togglingId === u.id ? "..." : u.isActive ? "Deactivate" : "Activate"}
                              </button>
                            </>
                          )}
                          {canDelete && (
                            <button
                              className="text-red-600 hover:text-red-700 text-sm font-semibold"
                              onClick={() => setDeletingUser(u)}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {processedUsers.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-slate-500">{t("users.empty")}</p>
            </div>
          )}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50 text-sm">
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => goToPage(page - 1)}
                className="px-3 py-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-white"
              >
                {t("common.previous", "Previous")}
              </button>
              <span className="text-slate-600 text-xs">
                Page {page + 1} of {totalPages}
              </span>
              <button
                type="button"
                disabled={page + 1 >= totalPages}
                onClick={() => goToPage(page + 1)}
                className="px-3 py-1.5 rounded border border-slate-200 disabled:opacity-40 hover:bg-white"
              >
                {t("common.next", "Next")}
              </button>
            </div>
          )}
        </div>
      )}

      <ConfirmDialog
        open={!!deletingUser}
        title={`Delete User?`}
        message={`Are you sure you want to delete ${deletingUser?.firstName} ${deletingUser?.lastName}? This action cannot be undone.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => void handleDeleteConfirmed()}
        onCancel={() => setDeletingUser(null)}
      />

      <EditUserModal
        userId={editUserId}
        onClose={() => setEditUserId(null)}
        onSuccess={() => {
          setEditUserId(null);
          void fetchUsers();
        }}
      />

      <CreateUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSuccess={() => {
          setIsModalOpen(false);
          fetchUsers();
        }}
      />
    </div>
  );
}

function SortHeader({
  label,
  active,
  onClick,
}: {
  label: string;
  active: string | null;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-0.5 hover:text-teal-800 uppercase"
    >
      {label}
      {active && <span className="text-teal-700 normal-case">{active}</span>}
    </button>
  );
}
