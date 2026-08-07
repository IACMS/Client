import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, apiDelete, apiGet, apiPost, isAbortError } from "@/lib/api";
import ConfirmDialog from "@/components/ConfirmDialog";

type Announcement = {
  id: string;
  title: string;
  body: string;
  expiresAt?: string | null;
  createdBy?: string | null;
  createdAt: string;
};

function CreateModal({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (open) { setTitle(""); setBody(""); setExpiresAt(""); setErr(null); }
  }, [open]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErr(null);
    try {
      await apiPost("/api/v1/platform/announcements", { title, body, expiresAt: expiresAt || null });
      onCreated();
      onClose();
    } catch (e) {
      setErr(e instanceof ApiError ? e.message : "Failed to create announcement");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg border border-slate-200" onClick={(e) => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-100">
          <h2 className="font-h3 text-primary">New Announcement</h2>
          <p className="text-xs text-slate-500 mt-1">Broadcast a message to all agency admins on the platform.</p>
        </div>
        <form onSubmit={(e) => void submit(e)} className="p-6 space-y-4">
          {err && <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-red-800 text-sm">{err}</div>}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="an-title">Title <span className="text-red-500">*</span></label>
            <input id="an-title" type="text" required value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" placeholder="e.g. Scheduled Maintenance on Saturday" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="an-body">Message <span className="text-red-500">*</span></label>
            <textarea id="an-body" rows={4} required value={body} onChange={(e) => setBody(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none" placeholder="Announcement message…" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="an-expires">Expires At (optional)</label>
            <input id="an-expires" type="datetime-local" value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 font-semibold">Cancel</button>
            <button type="submit" disabled={saving} className="px-5 py-2 text-sm rounded-lg bg-teal-700 text-white font-semibold hover:bg-teal-800 transition-colors disabled:opacity-50">
              {saving ? "Creating…" : "Broadcast"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function PlatformAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const fetchAll = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = (await apiGet("/api/v1/platform/announcements", { signal })) as { success: boolean; data: { announcements: Announcement[] } };
      if (!signal?.aborted) setAnnouncements(res.data?.announcements ?? []);
    } catch (e) {
      if (isAbortError(e) || signal?.aborted) return;
      setLoadError(e instanceof ApiError ? e.message : "Failed to load announcements");
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
    if (!deletingId) return;
    try {
      await apiDelete(`/api/v1/platform/announcements/${deletingId}`);
      setDeletingId(null);
      void fetchAll();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed to delete");
      setDeletingId(null);
    }
  };

  const isExpired = (expiresAt?: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  return (
    <div className="p-gutter max-w-7xl mx-auto w-full pb-10">
      <CreateModal open={createOpen} onClose={() => setCreateOpen(false)} onCreated={() => void fetchAll()} />
      <ConfirmDialog
        open={!!deletingId}
        title="Delete announcement?"
        message="This announcement will be removed from all agency admin views."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeletingId(null)}
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-slate-500 font-label-caps text-xs mb-2 flex-wrap">
          <span>Portal</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span>Platform</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">Announcements</span>
        </div>
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="font-h1 text-primary">Global Announcements</h1>
            <p className="font-body-md text-slate-600 mt-1">Broadcast platform-wide messages to all agency administrators.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/dashboard" className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold inline-flex items-center gap-2">
              <span className="material-symbols-outlined text-base">arrow_back</span>Dashboard
            </Link>
            <button type="button" onClick={() => setCreateOpen(true)} className="text-sm px-4 py-2 rounded-lg bg-teal-700 text-white hover:bg-teal-800 font-semibold inline-flex items-center gap-2 transition-colors">
              <span className="material-symbols-outlined text-base">campaign</span>New Announcement
            </button>
          </div>
        </div>
      </div>

      {loadError && <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-sm mb-6">{loadError}</div>}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Total</p>
          <p className="text-3xl font-bold text-teal-900 mt-1">{loading ? "…" : announcements.length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Active</p>
          <p className="text-3xl font-bold text-emerald-700 mt-1">{loading ? "…" : announcements.filter((a) => !isExpired(a.expiresAt)).length}</p>
        </div>
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Expired</p>
          <p className="text-3xl font-bold text-slate-500 mt-1">{loading ? "…" : announcements.filter((a) => isExpired(a.expiresAt)).length}</p>
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-12 text-center text-slate-400"><span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span></div>
      ) : announcements.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-12 text-center text-slate-400">
          <span className="material-symbols-outlined text-4xl mb-2 block">campaign</span>
          No announcements yet. Create one to broadcast to all agency admins.
        </div>
      ) : (
        <div className="space-y-4">
          {announcements.map((a) => {
            const expired = isExpired(a.expiresAt);
            return (
              <div key={a.id} className={`bg-white border rounded-xl p-5 shadow-sm ${expired ? "border-slate-100 opacity-60" : "border-slate-200"}`}>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-slate-800">{a.title}</h3>
                      {expired && <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 border border-slate-200">Expired</span>}
                    </div>
                    <p className="text-sm text-slate-600 whitespace-pre-wrap">{a.body}</p>
                    <div className="flex items-center gap-4 mt-3 text-xs text-slate-400">
                      <span>Created {new Date(a.createdAt).toLocaleString()}</span>
                      {a.expiresAt && <span>Expires {new Date(a.expiresAt).toLocaleString()}</span>}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDeletingId(a.id)}
                    className="text-xs font-semibold px-3 py-1 rounded text-red-700 bg-red-50 hover:bg-red-100 transition-colors shrink-0"
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
