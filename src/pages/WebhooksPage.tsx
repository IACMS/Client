import { useState, useEffect, useCallback } from "react";
import { ApiError } from "@/lib/api";
import {
  WebhookRecord,
  fetchAvailableEvents,
  listWebhooks,
  createWebhook,
  updateWebhook,
  deleteWebhook,
} from "@/lib/webhooks";

// ─── Sub-components ────────────────────────────────────────────────────────────

function RawSecretModal({
  secret,
  webhookName,
  onClose,
}: {
  secret: string;
  webhookName: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  function copyKey() {
    navigator.clipboard.writeText(secret).then(() => {
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
            <h2 className="font-semibold text-amber-900">Copy your Webhook Secret now</h2>
            <p className="text-sm text-amber-800 mt-0.5">
              This secret will <strong>not</strong> be shown again. Use it to verify X-IACMS-Signature-256 on incoming payloads.
            </p>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-slate-500">
            Webhook: <span className="font-semibold text-slate-700">{webhookName}</span>
          </p>
          <div className="relative">
            <code className="block w-full bg-slate-900 text-emerald-400 font-mono text-sm rounded-xl px-4 py-4 pr-14 break-all select-all">
              {secret}
            </code>
            <button
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
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 text-white font-semibold hover:bg-slate-700 transition-colors"
          >
            I've saved the secret — close
          </button>
        </div>
      </div>
    </div>
  );
}

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

function EventPills({ events }: { events: string[] }) {
  if (events.includes("*")) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
        All events (*)
      </span>
    );
  }
  return (
    <div className="flex flex-wrap gap-1">
      {events.map((e) => (
        <span
          key={e}
          className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-800 border border-teal-200"
        >
          {e}
        </span>
      ))}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function WebhooksPage() {
  const [availableEvents, setAvailableEvents] = useState<string[]>([
    "case.created", "case.updated", "case.transitioned", 
    "referral.created", "referral.accepted", "referral.rejected"
  ]);

  const [webhooks, setWebhooks] = useState<WebhookRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);

  // Form states
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<Set<string>>(new Set(["case.created"]));
  const [isActive, setIsActive] = useState(true);
  
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [secretModal, setSecretModal] = useState<{ secret: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<WebhookRecord | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    fetchAvailableEvents()
      .then((events) => { if (events.length > 0) setAvailableEvents(events); })
      .catch(() => {});
  }, []);

  const loadWebhooks = useCallback(async () => {
    setLoading(true);
    setListError(null);
    try {
      setWebhooks(await listWebhooks());
    } catch (err) {
      setListError(err instanceof ApiError ? err.message : "Failed to load webhooks.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadWebhooks();
  }, [loadWebhooks]);

  function openCreateForm() {
    setEditingId(null);
    setName("");
    setUrl("");
    setSelectedEvents(new Set(["case.created"]));
    setIsActive(true);
    setFormError(null);
    setShowForm(true);
  }

  function openEditForm(webhook: WebhookRecord) {
    setEditingId(webhook.id);
    setName(webhook.name);
    setUrl(webhook.url);
    setSelectedEvents(new Set(webhook.events));
    setIsActive(webhook.isActive);
    setFormError(null);
    setShowForm(true);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    if (!name.trim()) { setFormError("Webhook name is required."); return; }
    if (!url.trim()) { setFormError("Webhook URL is required."); return; }
    if (!url.startsWith("https://") && !url.startsWith("http://")) { setFormError("URL must start with http:// or https://"); return; }
    if (selectedEvents.size === 0) { setFormError("Select at least one event."); return; }

    setSaving(true);
    try {
      if (editingId) {
        await updateWebhook(editingId, {
          name: name.trim(),
          url: url.trim(),
          events: [...selectedEvents],
          isActive,
        });
        setShowForm(false);
        await loadWebhooks();
      } else {
        const result = await createWebhook({
          name: name.trim(),
          url: url.trim(),
          events: [...selectedEvents],
        });
        setSecretModal({ secret: result.secret, name: name.trim() });
        setShowForm(false);
        await loadWebhooks();
      }
    } catch (err) {
      setFormError(err instanceof ApiError ? err.message : "Failed to save webhook.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!confirmDelete) return;
    setActionLoading(true); setActionError(null);
    try {
      await deleteWebhook(confirmDelete.id);
      setConfirmDelete(null);
      await loadWebhooks();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to delete webhook.");
    } finally {
      setActionLoading(false);
    }
  }

  function toggleEvent(evt: string) {
    setSelectedEvents((prev) => {
      const next = new Set(prev);
      if (evt === "*") {
        if (next.has("*")) next.delete("*");
        else { next.clear(); next.add("*"); }
        return next;
      }
      if (next.has("*")) next.delete("*");
      next.has(evt) ? next.delete(evt) : next.add(evt);
      return next;
    });
  }

  async function toggleActive(id: string, currentlyActive: boolean) {
    try {
      await updateWebhook(id, { isActive: !currentlyActive });
      await loadWebhooks();
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Failed to toggle webhook.");
    }
  }

  function fmtDate(val: string) {
    return new Date(val).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  }

  return (
    <div className="p-gutter max-w-5xl mx-auto w-full pb-12">
      {secretModal && (
        <RawSecretModal
          secret={secretModal.secret}
          webhookName={secretModal.name}
          onClose={() => setSecretModal(null)}
        />
      )}
      {confirmDelete && (
        <ConfirmDialog
          title="Delete Webhook"
          body={`Are you sure you want to delete "${confirmDelete.name}"? This action cannot be undone.`}
          confirmLabel="Delete"
          onConfirm={handleDelete}
          onCancel={() => setConfirmDelete(null)}
          loading={actionLoading}
        />
      )}

      {/* Page header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-slate-400 font-label-caps text-xs mb-2">
          <span>Integrations</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">Webhooks</span>
        </div>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-h1 text-primary flex items-center gap-2">
              <span className="material-symbols-outlined text-3xl">webhook</span>
              Webhooks
            </h1>
            <p className="text-sm text-slate-500 mt-1 max-w-xl">
              Configure webhooks to receive real-time HTTP POST notifications when events occur in your tenant.
            </p>
          </div>
          <button
            onClick={showForm ? () => setShowForm(false) : openCreateForm}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity shadow-sm"
          >
            <span className="material-symbols-outlined text-[20px]">{showForm ? "close" : "add"}</span>
            {showForm ? "Cancel" : "New Webhook"}
          </button>
        </div>
      </div>

      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-3">
        <span className="material-symbols-outlined text-blue-600 mt-0.5">info</span>
        <div className="text-sm text-blue-900">
          <strong>Security:</strong> All payloads are signed with an HMAC-SHA256 signature using the secret provided when creating the webhook. Verify the <code className="font-mono bg-blue-100 px-1 rounded">X-IACMS-Signature-256</code> header to ensure the request is genuine.
        </div>
      </div>

      {/* ── Form ─────────────────────────────────────────── */}
      {showForm && (
        <form
          onSubmit={handleSave}
          className="mb-8 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
        >
          <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
            <h2 className="font-h3 text-slate-800">{editingId ? "Edit Webhook" : "Create New Webhook"}</h2>
          </div>
          <div className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  maxLength={128}
                  placeholder="e.g. Production Slack Alerts"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                  Payload URL <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  maxLength={2048}
                  placeholder="https://api.yourdomain.com/webhooks"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Events <span className="text-rose-500">*</span>
              </label>
              <div className="flex flex-wrap gap-2">
                <label
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedEvents.has("*") ? "border-purple-400 bg-purple-50 text-purple-800" : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <input type="checkbox" checked={selectedEvents.has("*")} onChange={() => toggleEvent("*")} className="accent-purple-600" />
                  <span className="text-sm font-medium">All Events (*)</span>
                </label>
                {availableEvents.map((evt) => (
                  <label
                    key={evt}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                      selectedEvents.has(evt) ? "border-teal-400 bg-teal-50 text-teal-800" : "border-slate-200 hover:bg-slate-50"
                    } ${selectedEvents.has("*") ? "opacity-50 pointer-events-none" : ""}`}
                  >
                    <input type="checkbox" checked={selectedEvents.has(evt)} onChange={() => toggleEvent(evt)} className="accent-teal-600" disabled={selectedEvents.has("*")} />
                    <span className="text-sm font-medium">{evt}</span>
                  </label>
                ))}
              </div>
            </div>

            {editingId && (
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} className="accent-primary w-4 h-4" />
                  <span className="text-sm font-semibold text-slate-700">Active</span>
                </label>
                <p className="text-xs text-slate-500 mt-1 ml-6">If inactive, events will not be sent to this URL.</p>
              </div>
            )}

            {formError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">
                <span className="material-symbols-outlined text-[18px]">error</span>
                {formError}
              </div>
            )}
          </div>
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-5 py-2 rounded-xl text-slate-600 font-medium hover:bg-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || selectedEvents.size === 0}
              className="px-6 py-2 rounded-xl bg-primary text-white font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center gap-2"
            >
              {saving && <span className="material-symbols-outlined animate-spin text-[18px]">sync</span>}
              {saving ? "Saving…" : "Save Webhook"}
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

      {/* ── Webhooks List ──────────────────────────────────── */}
      <section className="mb-10">
        <h2 className="font-h3 text-slate-700 mb-4 flex items-center gap-2">
          <span className="material-symbols-outlined text-emerald-600">dns</span>
          Configured Webhooks
          {webhooks.length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
              {webhooks.length}
            </span>
          )}
        </h2>

        {loading ? (
          <div className="flex items-center gap-2 text-slate-500 text-sm py-8">
            <span className="material-symbols-outlined animate-spin">sync</span>
            Loading webhooks…
          </div>
        ) : listError ? (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 text-sm">{listError}</div>
        ) : webhooks.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-200 rounded-2xl text-slate-400">
            <span className="material-symbols-outlined text-4xl block mb-2">webhook</span>
            <p className="text-sm">No webhooks configured yet.</p>
            <button
              onClick={openCreateForm}
              className="mt-3 text-primary text-sm font-semibold hover:underline"
            >
              Create your first webhook →
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {webhooks.map((wh) => (
              <div key={wh.id} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col hover:border-slate-300 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-slate-800 text-lg flex items-center gap-2">
                      {wh.name}
                      {!wh.isActive && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[10px] font-bold uppercase rounded-full tracking-wide">
                          Inactive
                        </span>
                      )}
                    </h3>
                    <a href={wh.url} target="_blank" rel="noreferrer" className="text-xs text-blue-600 hover:underline font-mono break-all line-clamp-1 mt-1">
                      {wh.url}
                    </a>
                  </div>
                  <div className="flex items-center">
                    <button
                      onClick={() => openEditForm(wh)}
                      className="p-1.5 text-slate-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                      title="Edit Webhook"
                    >
                      <span className="material-symbols-outlined text-[20px]">edit</span>
                    </button>
                    <button
                      onClick={() => setConfirmDelete(wh)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Delete Webhook"
                    >
                      <span className="material-symbols-outlined text-[20px]">delete</span>
                    </button>
                  </div>
                </div>
                <div className="flex-1 mb-4">
                  <EventPills events={wh.events} />
                </div>
                <div className="flex items-center justify-between mt-auto pt-4 border-t border-slate-100">
                  <span className="text-xs text-slate-400">Created {fmtDate(wh.createdAt)}</span>
                  <button
                    onClick={() => toggleActive(wh.id, wh.isActive)}
                    className={`text-xs font-semibold flex items-center gap-1 ${
                      wh.isActive ? "text-amber-600 hover:text-amber-700" : "text-emerald-600 hover:text-emerald-700"
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{wh.isActive ? "pause" : "play_arrow"}</span>
                    {wh.isActive ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
