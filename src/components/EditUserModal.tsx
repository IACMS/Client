import { FormEvent, useEffect, useState } from "react";
import { ApiError, apiGet, apiPatch } from "@/lib/api";
import { fetchRbacRoles, type RbacRoleRow } from "@/lib/workflowRoles";
import { useSession } from "@/context/SessionContext";

type DepartmentOption = { id: string; code?: string; name?: string };

type EditUserModalProps = {
  userId: string | null;
  onClose: () => void;
  onSuccess: () => void;
};

type UserDetail = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  departmentId?: string | null;
  department?: { id: string; code?: string; name?: string } | null;
  role?: { id: string; name: string } | null;
  isActive: boolean;
};

export default function EditUserModal({ userId, onClose, onSuccess }: EditUserModalProps) {
  const { user: sessionUser } = useSession();
  const tenantId = sessionUser?.tenant?.id ?? sessionUser?.tenantId ?? "";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [detail, setDetail] = useState<UserDetail | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [roleId, setRoleId] = useState("");

  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [roles, setRoles] = useState<RbacRoleRow[]>([]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    (async () => {
      try {
        const [userRes, deptsRes, rolesRes] = await Promise.all([
          apiGet(`/api/v1/auth/users/${userId}`) as Promise<{ user?: UserDetail }>,
          tenantId
            ? (fetch(`/api/v1/tenants/${tenantId}/departments`, { credentials: "include" })
                .then((r) => r.json()) as Promise<{ departments?: DepartmentOption[] }>)
            : Promise.resolve({ departments: [] }),
          fetchRbacRoles(tenantId ? { tenantId } : undefined),
        ]);
        if (cancelled) return;

        const u = (userRes as { user?: UserDetail }).user;
        if (!u) throw new Error("User not found");

        setDetail(u);
        setFirstName(u.firstName ?? "");
        setLastName(u.lastName ?? "");
        setPhone(u.phone ?? "");
        setDepartmentId(u.departmentId ?? "");
        setRoleId(u.role?.id ?? "");

        const depts = (deptsRes as { departments?: DepartmentOption[] }).departments ?? [];
        setDepartments(depts);
        setRoles(rolesRes);
      } catch (e) {
        if (!cancelled) setError(e instanceof ApiError ? e.message : "Could not load user details.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId, tenantId]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!userId || !detail) return;
    setError(null);
    setSuccessMsg(null);
    setSaving(true);

    try {
      const body: Record<string, unknown> = {};
      if (firstName.trim() !== (detail.firstName ?? "")) body.firstName = firstName.trim();
      if (lastName.trim() !== (detail.lastName ?? "")) body.lastName = lastName.trim();
      const phoneTrim = phone.trim();
      if (phoneTrim !== (detail.phone ?? "")) body.phone = phoneTrim || null;
      const newDeptId = departmentId || null;
      if (newDeptId !== (detail.departmentId ?? null)) body.departmentId = newDeptId;

      if (Object.keys(body).length > 0) {
        await apiPatch(`/api/v1/auth/users/${userId}`, body);
      }

      if (roleId && roleId !== (detail.role?.id ?? "")) {
        await apiPatch(`/api/v1/auth/users/${userId}/role`, { roleId });
      }

      setSuccessMsg("User updated successfully.");
      setTimeout(() => { onSuccess(); onClose(); }, 800);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not update user.");
    } finally {
      setSaving(false);
    }
  }

  if (!userId) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-outline-variant flex justify-between items-center">
          <h2 className="font-h2 text-primary">Edit User</h2>
          <button type="button" onClick={onClose} className="text-secondary hover:text-primary" aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">
            <span className="material-symbols-outlined animate-spin text-2xl">sync</span>
          </div>
        ) : error && !detail ? (
          <div className="p-6">
            <p className="text-red-700 text-sm">{error}</p>
            <button onClick={onClose} className="mt-4 text-primary text-sm font-semibold hover:underline">Close</button>
          </div>
        ) : (
          <form onSubmit={(e) => void handleSubmit(e)} className="p-6 overflow-y-auto flex-1 space-y-4">
            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>}
            {successMsg && <div className="p-3 bg-teal-50 border border-teal-200 rounded-lg text-teal-800 text-sm">{successMsg}</div>}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">First name</label>
                <input
                  type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1">Last name</label>
                <input
                  type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">
                Phone <span className="font-normal text-slate-400">(optional)</span>
              </label>
              <input
                type="text" value={phone} onChange={(e) => setPhone(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
                placeholder="e.g. +251 911 000 000"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Department</label>
              <select
                value={departmentId} onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">— No department —</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>{d.name ?? d.code ?? d.id}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1">Role</label>
              <select
                value={roleId} onChange={(e) => setRoleId(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/50"
                disabled={roles.length === 0}
              >
                <option value="">— No role change —</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button" onClick={onClose} disabled={saving}
                className="px-5 py-2 rounded-lg font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="submit" disabled={saving}
                className="px-5 py-2 rounded-lg font-semibold bg-primary text-white hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? <span className="material-symbols-outlined animate-spin text-[18px]">sync</span> : null}
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
