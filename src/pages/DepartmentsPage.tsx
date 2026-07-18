import { FormEvent, useEffect, useState } from "react";
import { useSession } from "@/context/SessionContext";
import { useIsAdmin } from "@/context/SessionContext";
import { ApiError, apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import ForbiddenView from "@/components/ForbiddenView";

type Department = {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
  createdAt?: string;
};

export default function DepartmentsPage() {
  const { user } = useSession();
  const { isAdmin } = useIsAdmin();
  const tenantId = user?.tenant?.id ?? user?.tenantId;

  const [depts, setDepts] = useState<Department[]>([]);
  const [loadState, setLoadState] = useState<"loading" | "ok" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // Edit state
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  async function loadDepts() {
    if (!tenantId) { setLoadState("error"); setErrorMsg("No tenant on session."); return; }
    setLoadState("loading");
    try {
      const data = (await apiGet(`/api/v1/tenants/${tenantId}/departments`)) as { departments?: Department[] };
      setDepts(Array.isArray(data.departments) ? data.departments : []);
      setLoadState("ok");
    } catch (e) {
      setErrorMsg(e instanceof ApiError ? e.message : "Could not load departments.");
      setLoadState("error");
    }
  }

  useEffect(() => { void loadDepts(); }, [tenantId]);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!tenantId) return;
    setCreateError(null);
    setCreating(true);
    try {
      await apiPost(`/api/v1/tenants/${tenantId}/departments`, {
        code: newCode.trim().toUpperCase(),
        name: newName.trim(),
        description: newDesc.trim() || null,
      });
      setNewCode(""); setNewName(""); setNewDesc("");
      setShowCreate(false);
      void loadDepts();
    } catch (e) {
      setCreateError(e instanceof ApiError ? e.message : "Could not create department.");
    } finally {
      setCreating(false);
    }
  }

  async function handleSaveEdit(deptId: string) {
    if (!tenantId) return;
    setEditError(null);
    setSaving(true);
    try {
      await apiPatch(`/api/v1/tenants/${tenantId}/departments/${deptId}`, {
        name: editName.trim(),
        description: editDesc.trim() || null,
      });
      setEditId(null);
      void loadDepts();
    } catch (e) {
      setEditError(e instanceof ApiError ? e.message : "Could not update department.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate(deptId: string, name: string) {
    if (!tenantId) return;
    if (!confirm(`Deactivate department "${name}"? Users and workflows will be unaffected but it will no longer appear in dropdowns.`)) return;
    try {
      await apiDelete(`/api/v1/tenants/${tenantId}/departments/${deptId}`);
      void loadDepts();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Could not deactivate department.");
    }
  }

  if (!isAdmin) {
    return <ForbiddenView resource="departments" detail="Only tenant administrators can manage departments." />;
  }

  return (
    <div className="p-gutter max-w-4xl mx-auto w-full pb-10">
      <header className="mb-8 flex justify-between items-end flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 text-slate-500 font-label-caps text-xs mb-2">
            <span>PORTAL</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span>SETTINGS</span>
            <span className="material-symbols-outlined text-xs">chevron_right</span>
            <span className="text-primary font-bold">DEPARTMENTS</span>
          </div>
          <h1 className="font-h1 text-primary">Departments</h1>
          <p className="font-body-md text-slate-600 mt-1">
            Manage your organization's departments. Departments group users, cases, and workflows within your agency.
          </p>
        </div>
        <button
          type="button"
          onClick={() => { setShowCreate(true); setCreateError(null); }}
          className="bg-primary text-white px-5 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-primary-container shadow-sm"
        >
          <span className="material-symbols-outlined">add</span>
          New department
        </button>
      </header>

      {showCreate && (
        <form onSubmit={(e) => void handleCreate(e)}
          className="bg-white border border-slate-200 rounded-xl p-5 mb-6 space-y-4 shadow-sm">
          <h2 className="font-h3 text-primary">Create department</h2>
          {createError && <p className="text-red-700 text-sm">{createError}</p>}
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Code <span className="font-normal text-slate-400">(unique, e.g. INTAKE)</span></label>
              <input required value={newCode} onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono uppercase"
                placeholder="INTAKE" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Name</label>
              <input required value={newName} onChange={(e) => setNewName(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                placeholder="Intake Department" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">Description <span className="font-normal text-slate-400">(optional)</span></label>
            <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              placeholder="What this department handles…" />
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => setShowCreate(false)}
              className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-50">
              Cancel
            </button>
            <button type="submit" disabled={creating}
              className="px-4 py-2 text-sm font-semibold bg-primary text-white rounded-lg hover:bg-primary-container disabled:opacity-50">
              {creating ? "Creating…" : "Create"}
            </button>
          </div>
        </form>
      )}

      {loadState === "loading" && (
        <div className="p-12 text-center text-slate-500">
          <span className="material-symbols-outlined animate-spin text-3xl">sync</span>
        </div>
      )}
      {loadState === "error" && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200">{errorMsg}</div>
      )}

      {loadState === "ok" && (
        <div className="bg-white border border-outline-variant rounded-xl shadow-sm overflow-hidden">
          {depts.length === 0 ? (
            <div className="p-12 text-center">
              <span className="material-symbols-outlined text-4xl text-slate-300">corporate_fare</span>
              <p className="text-slate-500 mt-2">No departments yet. Create one above.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-outline-variant text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="p-4">Code</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant">
                {depts.map((d) => (
                  <tr key={d.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-mono text-sm text-slate-600 font-semibold">{d.code}</td>
                    <td className="p-4">
                      {editId === d.id ? (
                        <input value={editName} onChange={(e) => setEditName(e.target.value)}
                          className="border border-slate-300 rounded px-2 py-1 text-sm w-full" />
                      ) : (
                        <span className="text-sm font-medium text-slate-800">{d.name}</span>
                      )}
                    </td>
                    <td className="p-4 text-sm text-slate-500">
                      {editId === d.id ? (
                        <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                          className="border border-slate-300 rounded px-2 py-1 text-sm w-full"
                          placeholder="Description…" />
                      ) : (
                        d.description ?? <span className="italic text-slate-400">—</span>
                      )}
                    </td>
                    <td className="p-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${d.isActive ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"}`}>
                        {d.isActive ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {editId === d.id ? (
                        <div className="flex items-center gap-2 justify-end">
                          {editError && <span className="text-red-600 text-xs">{editError}</span>}
                          <button onClick={() => setEditId(null)}
                            className="text-xs text-slate-500 hover:text-slate-700 px-2 py-1 rounded">
                            Cancel
                          </button>
                          <button onClick={() => void handleSaveEdit(d.id)} disabled={saving}
                            className="text-xs bg-primary text-white px-3 py-1 rounded font-semibold disabled:opacity-50">
                            {saving ? "Saving…" : "Save"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => { setEditId(d.id); setEditName(d.name); setEditDesc(d.description ?? ""); setEditError(null); }}
                            className="text-xs text-primary font-semibold hover:underline">
                            Edit
                          </button>
                          {d.isActive && (
                            <button onClick={() => void handleDeactivate(d.id, d.name)}
                              className="text-xs text-red-600 font-semibold hover:underline">
                              Deactivate
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );
}
