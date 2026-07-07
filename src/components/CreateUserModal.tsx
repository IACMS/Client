import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { apiPost, ApiError } from "@/lib/api";
import { fetchRbacRoles, type RbacRoleRow } from "@/lib/workflowRoles";
import { useSession } from "@/context/SessionContext";

type CreateUserModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
};

type DepartmentOption = {
  id: string;
  code?: string;
  name?: string;
};

export default function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const { t } = useTranslation();
  const { user, status } = useSession();
  const tenantId = user?.tenant?.id ?? user?.tenantId ?? "";
  const tenantLabel =
    user?.tenant?.name && user?.tenant?.code
      ? `${user.tenant.name} (${user.tenant.code})`
      : user?.tenant?.code ?? user?.tenant?.name ?? (tenantId ? `Tenant ${tenantId.slice(0, 8)}…` : "");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [roleId, setRoleId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [roles, setRoles] = useState<RbacRoleRow[]>([]);
  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    void (async () => {
      const list = tenantId ? await fetchRbacRoles({ tenantId }) : await fetchRbacRoles();
      if (!cancelled) setRoles(list);
      if (tenantId) {
        const res = (await fetch(`/api/v1/tenants/${tenantId}/departments`, { credentials: "include" }).then((r) => r.json())) as {
          departments?: DepartmentOption[];
        };
        if (!cancelled) setDepartments(Array.isArray(res.departments) ? res.departments : []);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isOpen, tenantId]);

  useEffect(() => {
    if (!isOpen) return;
    setFirstName("");
    setLastName("");
    setEmail("");
    setUsername("");
    setRoleId("");
    setDepartmentId("");
    setError(null);
    setLoading(false);
  }, [isOpen]);

  if (!isOpen) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!tenantId) {
      setError("Your session does not include an organization. Sign in again, then try inviting.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        tenantId,
      };
      const u = username.trim().toLowerCase();
      if (u) body.username = u;
      if (roleId) body.roleId = roleId;
      if (departmentId) body.departmentId = departmentId;

      await apiPost("/api/v1/auth/users/create", body);
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setLoading(false);
    }
  }

  const sessionReady = status === "ready";
  const canSubmit = sessionReady && !!tenantId && !loading;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-outline-variant flex justify-between items-center bg-surface-container-lowest">
          <h2 className="font-h2 text-primary">{t("modals.users.inviteTitle")}</h2>
          <button type="button" onClick={onClose} className="text-secondary hover:text-primary transition-colors" aria-label={t("common.close")}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="p-6 overflow-y-auto flex-1 space-y-4">
          <p className="text-sm text-slate-600">
            Creates an account in your organization with a temporary password. They must sign in and change their password
            before using the portal (same flow as email verification rules allow).
          </p>

          {!sessionReady && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 text-sm">{t("common.loading")}</div>
          )}
          {sessionReady && !tenantId && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-amber-900 text-sm">
              No organization on your session. You cannot invite users until you are signed in under a tenant.
            </div>
          )}
          {sessionReady && tenantId && tenantLabel && (
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-700">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide block mb-1">Organization</span>
              {tenantLabel}
            </div>
          )}

          {error && (
            <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200 text-sm">{error}</div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="invite-fn">
                First name
              </label>
              <input
                id="invite-fn"
                type="text"
                required
                autoComplete="given-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Jane"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="invite-ln">
                Last name
              </label>
              <input
                id="invite-ln"
                type="text"
                required
                autoComplete="family-name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="invite-email">
              {t("modals.users.email")}
            </label>
            <input
              id="invite-email"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50"
              placeholder="jane.doe@organization.org"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="invite-user">
              Username <span className="font-normal text-slate-400">({t("common.optional")})</span>
            </label>
            <input
              id="invite-user"
              type="text"
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50 font-mono text-sm"
              placeholder="Defaults to part before @ if empty"
            />
            <p className="text-[11px] text-slate-500 mt-1">Used at login with your tenant code. Leave blank to derive from email.</p>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="invite-dept">
              Department
            </label>
            <select
              id="invite-dept"
              value={departmentId}
              onChange={(e) => setDepartmentId(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
            >
              <option value="">No department yet</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name ?? d.code ?? d.id}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1" htmlFor="invite-role">
              {t("modals.users.role")}
            </label>
            <select
              id="invite-role"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              className="w-full px-4 py-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
              disabled={roles.length === 0}
            >
              <option value="">No role yet (assign later)</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {roles.length === 0 && (
              <p className="text-[11px] text-amber-700 mt-1">
                Could not load roles (permissions?). You can still create the user without a role.
              </p>
            )}
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2 rounded-lg font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={!canSubmit}
              className="px-5 py-2 rounded-lg font-semibold bg-primary text-white hover:bg-teal-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <span className="material-symbols-outlined animate-spin text-[20px]">sync</span>
              ) : (
                <span className="material-symbols-outlined text-[20px]">send</span>
              )}
              {loading ? t("modals.users.inviting") : t("modals.users.invite")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
