import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, apiGet, apiPatch, isAbortError } from "@/lib/api";

type Ticket = {
  id: string;
  title: string;
  body: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  priority: "low" | "normal" | "high" | "critical";
  tenantId?: string | null;
  createdAt: string;
  updatedAt: string;
};

const STATUS_LABELS: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  resolved: "Resolved",
  closed: "Closed",
};

const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-emerald-50 text-emerald-700 border-emerald-200",
  closed: "bg-slate-50 text-slate-500 border-slate-200",
};

const PRIORITY_STYLES: Record<string, string> = {
  low: "bg-slate-50 text-slate-500 border-slate-200",
  normal: "bg-blue-50 text-blue-600 border-blue-200",
  high: "bg-amber-50 text-amber-700 border-amber-200",
  critical: "bg-red-50 text-red-700 border-red-200",
};

export default function PlatformSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchAll = useCallback(async (signal?: AbortSignal) => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const res = (await apiGet("/api/v1/platform/support-tickets", { ...params, signal })) as {
        success: boolean;
        data: { tickets: Ticket[] };
      };
      if (!signal?.aborted) setTickets(res.data?.tickets ?? []);
    } catch (e) {
      if (isAbortError(e) || signal?.aborted) return;
      setLoadError(e instanceof ApiError ? e.message : "Failed to load tickets");
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    const ac = new AbortController();
    void fetchAll(ac.signal);
    return () => ac.abort();
  }, [fetchAll]);

  const updateTicket = async (id: string, updates: Partial<Pick<Ticket, "status" | "priority">>) => {
    setUpdatingId(id);
    try {
      await apiPatch(`/api/v1/platform/support-tickets/${id}`, updates);
      void fetchAll();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Failed to update ticket");
    } finally {
      setUpdatingId(null);
    }
  };

  const counts = {
    open: tickets.filter((t) => t.status === "open").length,
    in_progress: tickets.filter((t) => t.status === "in_progress").length,
    resolved: tickets.filter((t) => t.status === "resolved").length,
    critical: tickets.filter((t) => t.priority === "critical").length,
  };

  return (
    <div className="p-gutter max-w-7xl mx-auto w-full pb-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-slate-500 font-label-caps text-xs mb-2 flex-wrap">
          <span>Portal</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span>Platform</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">Support Tickets</span>
        </div>
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="font-h1 text-primary">Support Ticketing</h1>
            <p className="font-body-md text-slate-600 mt-1">
              View and manage support requests from agency administrators.
            </p>
          </div>
          <Link to="/dashboard" className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 font-semibold inline-flex items-center gap-2">
            <span className="material-symbols-outlined text-base">arrow_back</span>Dashboard
          </Link>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: "Open", value: loading ? "…" : counts.open, color: "text-blue-700" },
          { label: "In Progress", value: loading ? "…" : counts.in_progress, color: "text-amber-700" },
          { label: "Resolved", value: loading ? "…" : counts.resolved, color: "text-emerald-700" },
          { label: "Critical", value: loading ? "…" : counts.critical, color: counts.critical > 0 ? "text-red-600" : "text-slate-500" },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest">{s.label}</p>
            <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {loadError && <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-900 text-sm mb-6">{loadError}</div>}

      {/* Filter */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
          <label className="text-xs font-semibold text-slate-500 uppercase">Status Filter:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm bg-white"
          >
            <option value="">All</option>
            {Object.entries(STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>

        {loading ? (
          <div className="py-12 text-center text-slate-400"><span className="material-symbols-outlined animate-spin text-3xl">progress_activity</span></div>
        ) : tickets.length === 0 ? (
          <div className="py-12 text-center text-slate-400">
            <span className="material-symbols-outlined text-4xl mb-2 block">support_agent</span>
            No tickets found.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tickets.map((ticket) => (
              <div key={ticket.id} className="px-5 py-4 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${STATUS_STYLES[ticket.status] ?? ""}`}>
                        {STATUS_LABELS[ticket.status] ?? ticket.status}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${PRIORITY_STYLES[ticket.priority] ?? ""}`}>
                        {ticket.priority}
                      </span>
                    </div>
                    <h3 className="font-semibold text-slate-800">{ticket.title}</h3>
                    <p className="text-sm text-slate-600 mt-1 line-clamp-2">{ticket.body}</p>
                    <p className="text-xs text-slate-400 mt-2">
                      Opened {new Date(ticket.createdAt).toLocaleString()}
                      {ticket.tenantId && <span className="ml-2 font-mono">· {ticket.tenantId.slice(0, 8)}…</span>}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5 items-end shrink-0">
                    <select
                      value={ticket.status}
                      disabled={updatingId === ticket.id}
                      onChange={(e) => void updateTicket(ticket.id, { status: e.target.value as Ticket["status"] })}
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white disabled:opacity-50"
                    >
                      {Object.entries(STATUS_LABELS).map(([v, l]) => (
                        <option key={v} value={v}>{l}</option>
                      ))}
                    </select>
                    <select
                      value={ticket.priority}
                      disabled={updatingId === ticket.id}
                      onChange={(e) => void updateTicket(ticket.id, { priority: e.target.value as Ticket["priority"] })}
                      className="border border-slate-200 rounded-lg px-2 py-1.5 text-xs bg-white disabled:opacity-50"
                    >
                      {["low", "normal", "high", "critical"].map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
