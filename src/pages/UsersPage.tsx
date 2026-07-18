import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiGet } from "@/lib/api";
import CreateUserModal from "@/components/CreateUserModal";
import EditUserModal from "@/components/EditUserModal";
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
  const [editUserId, setEditUserId] = useState<string | null>(null);

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
                  <th className="p-4 font-semibold">{t("users.table.user")}</th>
                  <th className="p-4 font-semibold">{t("users.table.role")}</th>
                  <th className="p-4 font-semibold">Department</th>
                  <th className="p-4 font-semibold">
                    {t("users.table.status")}
                  </th>
                  <th className="p-4 font-semibold">
                    {t("users.table.lastLogin")}
                  </th>
                  {canEdit && (
                    <th className="p-4 font-semibold text-right">
                      {t("users.table.actions")}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {users.map((u) => (
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
                    {canEdit && (
                      <td className="p-4 text-right">
                        <button
                          className="text-primary hover:text-primary text-sm font-semibold"
                          onClick={() => setEditUserId(u.id)}
                        >
                          {t("users.edit")}
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {users.length === 0 && (
            <div className="p-12 text-center">
              <p className="text-slate-500">{t("users.empty")}</p>
            </div>
          )}
        </div>
      )}

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
