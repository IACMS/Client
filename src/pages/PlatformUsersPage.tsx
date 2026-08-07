import { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import { ApiError, apiDelete, apiGet, apiPatch, apiPost, isAbortError } from "@/lib/api";
import ConfirmDialog from "@/components/ConfirmDialog";

type PlatformUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isActive: boolean;
  lastLogin: string | null;
  createdAt: string;
  roles: { id: string; name: string }[];
};

type FormState = {
  email: string;
  firstName: string;
  lastName: string;
};

const empty: FormState = { email: "", firstName: "", lastName: "" };

function CreateUserModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState<FormState>(empty);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setForm(empty); setErr(null); }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await apiPost("/api/v1/platform/users", form);
      onCreated();
      onClose();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md border border-slate-200"
        role="dialog"
        aria-labelledby="create-platform-user-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-100">
          <h2 id="create-platform-user-title" className="font-h3 text-primary">Create Platform Admin</h2>
          <p className="text-xs text-slate-500 mt-1">The new user will receive a temporary password and be assigned the system_admin role.</p>
        </div>
        <form onSubmit={(e) => void submit(e)} className="p-6 space-y-4">
          {err && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-800 text-sm">{err}</div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="pu-first-name">First Name</label>
              <input
                id="pu-first-name"
                type="text"
                required
                value={form.firstName}
                onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="pu-last-name">Last Name</label>
              <input
                id="pu-last-name"
                type="text"
                required
                value={form.lastName}
                onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="pu-email">Email</label>
            <input
              id="pu-email"
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
              placeholder="admin@example.com"
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
              {saving ? "Creating…" : "Create Admin"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PlatformUsersPage() {
  const { t } = useTranslation();
  const { user } = useSession();

  const [users, setUsers] = useState<PlatformUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deactivating, setDeactivating] = useState<PlatformUser | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);

  const fetchUsers = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = (await apiGet("/api/v1/platform/users", { signal })) as { success: boolean; data: { users: PlatformUser[] } };
      if (!signal?.aborted) setUsers(res.data?.users ?? []);
    } catch (e) {
      if (isAbortError(e) || signal?.aborted) return;
      setLoadError(e instanceof ApiError ? e.message : "Failed to load platform users");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void fetchUsers(ac.signal);
    return () => ac.abort();
  }, [fetchUsers]);

  const handleToggleActive = async (u: PlatformUser) => {
    if (togglingId) return;
    setTogglingId(u.id);
    try {
      await apiPatch(`/api/v1/platform/users/${u.id}`, { isActive: !u.isActive });
      void fetchUsers();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed to update user");
    } finally {
      setTogglingId(null);
    }
  };

  const handleDeactivateConfirmed = async () => {
    if (!deactivating) return;
    try {
      await apiDelete(`/api/v1/platform/users/${deactivating.id}`);
      setDeactivating(null);
      void fetchUsers();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed to deactivate user");
      setDeactivating(null);
    }
  };

  return (
    <div className="p-gutter max-w-7xl mx-auto w-full pb-10">
      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={() => void fetchUsers()}
      />

      <ConfirmDialog
        open={!!deactivating}
        title={`Deactivate "${deactivating?.firstName} ${deactivating?.lastName}"?`}
        message="This admin will lose all platform access immediately. You can reactivate them later."
        confirmLabel="Deactivate"
        variant="danger"
        onConfirm={() => void handleDeactivateConfirmed()}
        onCancel={() => setDeactivating(null)}
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-slate-500 font-label-caps text-xs mb-2 flex-wrap">
          <span>{t("portal.breadcrumb.portal")}</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span>Platform</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">Admins</span>
        </div>
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="font-h1 text-primary">Platform Administrators</h1>
            <p className="font-body-md text-slate-600 mt-1">
              Manage super-admin users who have access to the platform control panel.
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
              onClick={() => setCreateOpen(true)}
              className="text-sm px-4 py-2 rounded-lg bg-teal-700 text-white hover:bg-teal-800 font-semibold inline-flex items-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined text-base">person_add</span>
              Add Admin
            </button>
          </div>
        </div>
      </div>

      {loadError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-sm mb-6">{loadError}</div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Total Admins</p>
          <p className="text-3xl font-bold text-teal-900 mt-1">{loading ? "…" : users.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Active</p>
          <p className="text-3xl font-bold text-emerald-700 mt-1">
            {loading ? "…" : users.filter((u) => u.isActive).length}
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">My Account</p>
          <p className="text-sm font-semibold text-slate-700 mt-1 truncate">{user?.email ?? "—"}</p>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm min-w-[600px]">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-widest">Admin</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-widest">Role</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-widest">Status</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-widest">Last Login</th>
              <th className="px-4 py-3 text-left font-semibold text-slate-600 text-xs uppercase tracking-widest">Joined</th>
              <th className="px-4 py-3 text-right font-semibold text-slate-600 text-xs uppercase tracking-widest">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  <span className="material-symbols-outlined animate-spin text-2xl">progress_activity</span>
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">No platform administrators found</td>
              </tr>
            ) : (
              users.map((u) => {
                const isSelf = u.id === user?.id;
                return (
                  <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 font-bold text-sm shrink-0">
                          {u.firstName.charAt(0)}{u.lastName.charAt(0)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-800">
                            {u.firstName} {u.lastName}
                            {isSelf && (
                              <span className="ml-1.5 text-[10px] font-bold bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full">You</span>
                            )}
                          </p>
                          <p className="text-xs text-slate-500">{u.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.roles.length > 0
                        ? u.roles.map((r) => (
                          <span key={r.id} className="text-xs bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5 font-semibold mr-1">
                            {r.name.replace("_", " ")}
                          </span>
                        ))
                        : <span className="text-slate-400 text-xs">—</span>
                      }
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                        u.isActive
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-red-50 text-red-700 border-red-200"
                      }`}>
                        {u.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : "Never"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(u.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {!isSelf && (
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={togglingId === u.id}
                            onClick={() => void handleToggleActive(u)}
                            className={`text-xs font-semibold px-3 py-1 rounded transition-colors disabled:opacity-50 ${
                              u.isActive
                                ? "text-amber-700 bg-amber-50 hover:bg-amber-100"
                                : "text-emerald-700 bg-emerald-50 hover:bg-emerald-100"
                            }`}
                          >
                            {togglingId === u.id ? "…" : u.isActive ? "Suspend" : "Activate"}
                          </button>
                          {u.isActive && (
                            <button
                              type="button"
                              onClick={() => setDeactivating(u)}
                              className="text-xs font-semibold px-3 py-1 rounded text-red-700 bg-red-50 hover:bg-red-100 transition-colors"
                            >
                              Remove
                            </button>
                          )}
                        </div>
                      )}
                      {isSelf && (
                        <span className="text-xs text-slate-300 italic">Current session</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
