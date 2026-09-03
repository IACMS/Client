import { useState, useEffect, useCallback } from "react";
import { ApiError } from "@/lib/api";
import {
  ScopeMeta,
  ApiKeyRecord,
  ApiKeyScope,
  fetchAvailableScopes,
  listApiKeys,
  createApiKey,
  revokeApiKey,
  rotateApiKey,
} from "@/lib/apiKeys";

// ─── Sub-components ────────────────────────────────────────────────────────────

/** One-time raw key display modal shown after create or rotate. */
function RawKeyModal({
  rawKey,
  keyName,
  onClose,
}: {
  rawKey: string;
  keyName: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copyKey() {
    navigator.clipboard.writeText(rawKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex items-start gap-3">
          <span className="material-symbols-outlined text-amber-600 text-2xl mt-0.5">warning</span>
          <div>
            <h2 className="font-semibold text-amber-900">Copy your API key now</h2>
            <p className="text-sm text-amber-800 mt-0.5">
              This key will <strong>not</strong> be shown again. Store it in a secure secrets manager.
            </p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500">
            Key: <span className="font-semibold text-slate-700">{keyName}</span>
          </p>
          <div className="relative">
            <code className="block w-full bg-slate-900 text-emerald-400 font-mono text-sm rounded-xl px-4 py-4 pr-14 break-all select-all">
              {rawKey}
            </code>
            <button
              id="copy-raw-key-btn"
              onClick={copyKey}
              className="absolute top-3 right-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg p-1.5 transition-colors"
              title="Copy to clipboard"
            >
              <span className="material-symbols-outlined text-[18px]">
                {copied ? "check" : "content_copy"}
              </span>
            </button>
          </div>
          {copied && (
            <p className="text-emerald-700 text-sm flex items-center gap-1">
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Copied to clipboard
            </p>
          )}
        </div>
        <div className="px-6 pb-6">
          <button
            id="close-raw-key-modal-btn"
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors"
          >
            I've saved my key — close
          </button>
        </div>
      </div>
    </div>
  );
}

/** Confirmation dialog for revoke / rotate actions. */
function ConfirmDialog({
  title,
  body,
  confirmLabel,
  confirmClass,
  onConfirm,
  onCancel,
  loading,
}: {
  title: string;
  body: string;
  confirmLabel: string;
  confirmClass?: string;
  onConfirm: () => void;
  onCancel: () => void;
  loading?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h3 className="font-semibold text-slate-900 text-lg">{title}</h3>
        <p className="text-sm text-slate-600">{body}</p>
        <div className="flex gap-3 pt-2">
          <button
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 py-2 rounded-xl font-semibold text-white transition-colors disabled:opacity-50 ${confirmClass ?? "bg-rose-600 hover:bg-rose-700"}`}
          >
            {loading ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Scope pills displayed on each key row. */
function ScopePills({ scopes }: { scopes: ApiKeyScope[] }) {
  if (scopes.includes("*")) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
        All scopes (*)
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {scopes.map((s) => (
        <span
          key={s}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-800 border border-teal-200"
        >
          {s}
        </span>
      ))}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function ApiKeysPage() {
  // ── State: available scopes (fetched from backend; fallback ensures checklist is never empty)
  const [availableScopes, setAvailableScopes] = useState<ScopeMeta[]>(() =>
    // Render a sensible default immediately so the checklist works even before the
    // API responds. fetchAvailableScopes() will replace this with the live list.
    [
      { value: "cases:read",       label: "Cases — Read",       description: "Query case records, status, history" },
      { value: "cases:create",     label: "Cases — Create",     description: "Submit new cases into the platform" },
      { value: "cases:update",     label: "Cases — Update",     description: "Execute workflow transitions on cases" },
      { value: "referrals:read",   label: "Referrals — Read",   description: "Query cross-agency referral records" },
      { value: "referrals:create", label: "Referrals — Create", description: "Dispatch new inter-agency referrals" },
      { value: "workflows:read",   label: "Workflows — Read",   description: "Query workflow definitions and steps" },
      { value: "workflows:update", label: "Workflows — Update", description: "Execute workflow state transitions" },
      { value: "assignments:read", label: "Assignments — Read", description: "Query officer assignment records" },
      { value: "auditLogs:read",   label: "Audit Logs — Read",  description: "Query immutable audit trail entries" },
      { value: "departments:read", label: "Departments — Read", description: "Query department / desk records" },
    ]
  );

  // ── State: key list
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [loadingKeys, setLoadingKeys] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // ── State: create form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newScopes, setNewScopes] = useState<Set<ApiKeyScope>>(new Set(["cases:read"]));
  // Expiry: date-only field; ISO timestamp is built as end-of-day on submit
  const [newExpiryDate, setNewExpiryDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  // ── State: one-time raw key modal
  const [rawKeyModal, setRawKeyModal] = useState<{ rawKey: string; name: string } | null>(null);

  // ── State: confirm dialogs
  const [confirmRevoke, setConfirmRevoke] = useState<ApiKeyRecord | null>(null);
  const [confirmRotate, setConfirmRotate] = useState<ApiKeyRecord | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // ── Load available scopes from backend (enriches the fallback list)
  useEffect(() => {
    fetchAvailableScopes()
      .then((scopes) => { if (scopes.length > 0) setAvailableScopes(scopes); })
      .catch(() => { /* Non-fatal: fallback list is already shown */ });
  }, []);

  // ── Load keys
  const loadKeys = useCallback(async () => {
    setLoadingKeys(true);
    setListError(null);
    try {
      setKeys(await listApiKeys());
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : "Failed to load API keys.");
    } finally {
      setLoadingKeys(false);
    }
  }, []);

  useEffect(() => {
    loadKeys();
  }, [loadKeys]);

  // ── Create key
  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreateError(null);
    if (!newName.trim()) { setCreateError("Key name is required."); return; }
    if (newScopes.size === 0) { setCreateError("Select at least one scope."); return; }

    // Build end-of-day ISO timestamp from the date field
    const expiresAt: string | null = newExpiryDate
      ? `${newExpiryDate}T23:59:59`
      : null;

    setCreating(true);
    try {
      const result = await createApiKey({
        name: newName.trim(),
        scopes: [...newScopes],
        expiresAt,
      });
      setRawKeyModal({ rawKey: result.apiKey.rawKey, name: newName.trim() });
      setNewName(""); setNewScopes(new Set(["cases:read"]));
      setNewExpiryDate("");
      setShowCreateForm(false);
      await loadKeys();
    } catch (err) {
      setCreateError(err instanceof ApiError ? err.message : "Failed to create API key.");
    } finally {
      setCreating(false);
    }
  }

  // ── Revoke key
  async function handleRevoke() {
    if (!confirmRevoke) return;
    setActionLoading(true); setActionError(null);
    try {
      await revokeApiKey(confirmRevoke.id);
      setConfirmRevoke(null);
      await loadKeys();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to revoke key.");
    } finally {
      setActionLoading(false);
    }
  }

  // ── Rotate key
  async function handleRotate() {
    if (!confirmRotate) return;
    setActionLoading(true); setActionError(null);
    try {
      const result = await rotateApiKey(confirmRotate.id);
      setRawKeyModal({ rawKey: result.apiKey.rawKey, name: result.apiKey.name });
      setConfirmRotate(null);
      await loadKeys();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to rotate key.");
    } finally {
      setActionLoading(false);
    }
  }

  function toggleScope(scope: ApiKeyScope) {
    setNewScopes((prev) => {
      const next = new Set(prev);
      next.has(scope) ? next.delete(scope) : next.add(scope);
      return next;
    });
  }

  const activeKeys = keys.filter((k) => k.isActive);
  const revokedKeys = keys.filter((k) => !k.isActive);

  function fmtDate(val: string | null) {
    if (!val) return "—";
    return new Date(val).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  // ── Render
  return (
    <div className="p-gutter max-w-5xl mx-auto w-full pb-12">
      {/* Modals */}
      {rawKeyModal && (
        <RawKeyModal
          rawKey={rawKeyModal.rawKey}
          keyName={rawKeyModal.name}
          onClose={() => setRawKeyModal(null)}
        />
      )}
      {confirmRevoke && (
        <ConfirmDialog
          title="Revoke API Key"
          body={`This will immediately invalidate "${confirmRevoke.name}". Any system using this key will receive 401 errors.`}
          confirmLabel="Revoke key"
          onConfirm={handleRevoke}
          onCancel={() => setConfirmRevoke(null)}
          loading={actionLoading}
        />
      )}
      {confirmRotate && (
        <ConfirmDialog
          title="Rotate API Key"
          body={`This will revoke "${confirmRotate.name}" and issue a new key with the same name and scopes. Update your integration immediately.`}
          confirmLabel="Rotate key"
          confirmClass="bg-amber-600 hover:bg-amber-700"
          onConfirm={handleRotate}
          onCancel={() => setConfirmRotate(null)}
          loading={actionLoading}
        />
      )}

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-slate-400 font-label-caps text-xs mb-2">
          <span>Integrations</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">Partner API Keys</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-h1 text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-3xl">key</span>
              Partner API Keys
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              Issue API keys to external systems and partner agencies. Keys authenticate against{" "}
              <code className="font-mono bg-slate-100 px-1 rounded text-xs">POST /api/v1/query</code>{" "}
              without a user session.
            </p>
          </div>
          <button
            id="create-api-key-btn"
            onClick={() => setShowCreateForm((v) => !v)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">{showCreateForm ? "close" : "add"}</span>
            {showCreateForm ? "Cancel" : "New API Key"}
          </button>
        </div>
      </div>

      {/* Info banner */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
        <span className="material-symbols-outlined text-blue-600 mt-0.5">info</span>
        <div className="text-sm text-blue-900">
          <strong>Single Endpoint:</strong> All partner queries and mutations go to{" "}
          <code className="font-mono bg-blue-100 px-1 rounded">POST /api/v1/query</code> with the{" "}
          <code className="font-mono bg-blue-100 px-1 rounded">X-API-Key</code> header. Keys are
          tenant-scoped — a partner can only access your agency's data.
        </div>
      </div>

      {/* ── Create Form ─────────────────────────────────────────── */}
      {showCreateForm && (
        <form
          id="create-api-key-form"
          onSubmit={handleCreate}
          className="mb-8 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-h3 text-slate-800">Create New API Key</h2>
          </div>
          <div className="p-6 space-y-6">
            {/* Name */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="key-name">
                Key Name <span className="text-rose-500">*</span>
              </label>
              <input
                id="key-name"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                maxLength={128}
                placeholder="e.g. Court System Integration, Police Desk Sync"
                className="w-full max-w-md px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Scopes */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Permissions (Scopes) <span className="text-rose-500">*</span>
              </label>
              <p className="text-xs text-slate-500 mb-3">Select only what the partner system needs (principle of least privilege).</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {availableScopes.map((scope) => (
                  <label
                    key={scope.value}
                    className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                      newScopes.has(scope.value)
                        ? "border-teal-400 bg-teal-50"
                        : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="checkbox"
                      id={`scope-${scope.value}`}
                      checked={newScopes.has(scope.value)}
                      onChange={() => toggleScope(scope.value)}
                      className="mt-0.5 accent-teal-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-slate-800">{scope.label}</p>
                      <p className="text-xs text-slate-500">{scope.description}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Expiry — date-only; key expires at end of the chosen day */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5" htmlFor="key-expiry-date">
                Expiry Date <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                id="key-expiry-date"
                type="date"
                value={newExpiryDate}
                onChange={(e) => setNewExpiryDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
              <p className="text-xs text-slate-400 mt-1.5">
                Leave blank for a non-expiring key. The key expires at end of the selected day.
              </p>
            </div>

            {createError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {createError}
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-5 py-2 rounded-xl text-slate-600 font-medium hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              id="submit-create-key-btn"
              type="submit"
              disabled={creating || newScopes.size === 0}
              className="px-6 py-2 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {creating && <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>}
              {creating ? "Creating…" : "Create Key"}
            </button>
          </div>
        </form>
      )}

      {actionError && (
        <div className="mb-4 flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
          <span className="material-symbols-outlined text-[18px]">error</span>
          {actionError}
        </div>
      )}

      {/* ── Active Keys Table ──────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="font-h3 text-slate-700 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-600">verified</span>
          Active Keys
          {activeKeys.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
              {activeKeys.length}
            </span>
          )}
        </h2>

        {loadingKeys ? (
          <div className="flex items-center gap-2 text-slate-500 text-sm py-8">
            <span className="material-symbols-outlined animate-spin">sync</span>
            Loading keys…
          </div>
        ) : listError ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">{listError}</div>
        ) : activeKeys.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
            <span className="material-symbols-outlined text-4xl block mb-2">key_off</span>
            <p className="text-sm">No active API keys yet.</p>
            <button
              onClick={() => setShowCreateForm(true)}
              className="mt-3 text-primary text-sm font-semibold hover:underline"
            >
              Create your first key →
            </button>
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="text-left px-5 py-3">Name / Prefix</th>
                  <th className="text-left px-5 py-3">Scopes</th>
                  <th className="text-left px-5 py-3">Created</th>
                  <th className="text-left px-5 py-3">Expires</th>
                  <th className="text-left px-5 py-3">Last Used</th>
                  <th className="text-right px-5 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeKeys.map((key) => (
                  <tr key={key.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-slate-800">{key.name}</p>
                      <code className="text-xs text-slate-400 font-mono">{key.keyPrefix}…</code>
                    </td>
                    <td className="px-5 py-4 max-w-xs">
                      <ScopePills scopes={key.scopes} />
                    </td>
                    <td className="px-5 py-4 text-slate-500 whitespace-nowrap">{fmtDate(key.createdAt)}</td>
                    <td className="px-5 py-4 whitespace-nowrap">
                      {key.expiresAt ? (
                        <span className={new Date(key.expiresAt) < new Date() ? "text-rose-600 font-medium" : "text-slate-500"}>
                          {fmtDate(key.expiresAt)}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs italic">Never</span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-500 whitespace-nowrap">
                      {key.lastUsedAt ? fmtDate(key.lastUsedAt) : <span className="text-slate-300 text-xs italic">Never</span>}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          id={`rotate-key-${key.id}`}
                          onClick={() => { setActionError(null); setConfirmRotate(key); }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 bg-amber-50 hover:bg-amber-100 text-xs font-semibold transition-colors"
                          title="Rotate this key"
                        >
                          <span className="material-symbols-outlined text-[14px]">autorenew</span>
                          Rotate
                        </button>
                        <button
                          id={`revoke-key-${key.id}`}
                          onClick={() => { setActionError(null); setConfirmRevoke(key); }}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-rose-200 text-rose-700 bg-rose-50 hover:bg-rose-100 text-xs font-semibold transition-colors"
                          title="Revoke this key"
                        >
                          <span className="material-symbols-outlined text-[14px]">block</span>
                          Revoke
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* ── Revoked Keys (collapsed) ───────────────────────────── */}
      {revokedKeys.length > 0 && (
        <section>
          <details className="group">
            <summary className="cursor-pointer list-none flex items-center gap-2 font-h3 text-slate-400 hover:text-slate-600 transition-colors mb-4">
              <span className="material-symbols-outlined text-[20px] group-open:rotate-90 transition-transform">chevron_right</span>
              Revoked Keys ({revokedKeys.length})
            </summary>
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-x-auto opacity-70">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50 text-xs font-semibold text-slate-500 uppercase tracking-wide">
                    <th className="text-left px-5 py-3">Name / Prefix</th>
                    <th className="text-left px-5 py-3">Scopes</th>
                    <th className="text-left px-5 py-3">Created</th>
                    <th className="text-left px-5 py-3">Revoked</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {revokedKeys.map((key) => (
                    <tr key={key.id} className="text-slate-400">
                      <td className="px-5 py-3">
                        <p className="font-medium line-through">{key.name}</p>
                        <code className="text-xs font-mono">{key.keyPrefix}…</code>
                      </td>
                      <td className="px-5 py-3"><ScopePills scopes={key.scopes} /></td>
                      <td className="px-5 py-3 whitespace-nowrap">{fmtDate(key.createdAt)}</td>
                      <td className="px-5 py-3 whitespace-nowrap">{fmtDate(key.revokedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </section>
      )}
    </div>
  );
}
