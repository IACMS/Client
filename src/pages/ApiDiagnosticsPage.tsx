import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, apiGet } from "@/lib/api";

type Row = { path: string; label: string; status: number | null; ok: boolean; detail?: string };

const STATIC_PROBES: { path: string; label: string }[] = [
  { path: "/api/v1/cases", label: "Cases" },
  { path: "/api/v1/referrals", label: "Referrals" },
  { path: "/api/v1/workflows", label: "Workflows" },
  { path: "/api/v1/audit", label: "Audit logs" },
  { path: "/api/v1/rbac/roles", label: "RBAC roles" },
  { path: "/api/v1/integrations", label: "Integrations" },
  { path: "/api/v1/notifications", label: "Notifications" },
  { path: "/api/v1/assignments", label: "Assignments" },
];

export default function ApiDiagnosticsPage() {
  const [rows, setRows] = useState<Row[]>(() =>
    STATIC_PROBES.map((p) => ({ path: p.path, label: p.label, status: null, ok: false })),
  );
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    const next: Row[] = [];
    let firstCaseId: string | undefined;

    for (const p of STATIC_PROBES) {
      try {
        const data = await apiGet(p.path);
        next.push({ path: p.path, label: p.label, status: 200, ok: true });
        if (p.path === "/api/v1/cases" && data && typeof data === "object") {
          const cases = (data as { cases?: { id: string }[] }).cases;
          firstCaseId = cases?.[0]?.id;
        }
      } catch (err) {
        const status = err instanceof ApiError ? err.status : 0;
        const detail = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Error";
        next.push({ path: p.path, label: p.label, status, ok: false, detail });
      }
    }

    if (firstCaseId) {
      const attPath = `/api/v1/attachments/case/${firstCaseId}`;
      try {
        await apiGet(attPath);
        next.push({ path: attPath, label: "Attachments (first case)", status: 200, ok: true });
      } catch (err) {
        const status = err instanceof ApiError ? err.status : 0;
        const detail = err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Error";
        next.push({ path: attPath, label: "Attachments (first case)", status, ok: false, detail });
      }
    }

    setRows(next);
    setRunning(false);
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  return (
    <div className="p-gutter max-w-3xl space-y-6 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-h2 text-primary">API connectivity</h1>
          <p className="text-sm text-slate-600 mt-1">
            Probes gateway routes with your session and JWT. 403 often means missing RBAC permission for that resource.
          </p>
        </div>
        <button
          type="button"
          disabled={running}
          onClick={() => void run()}
          className="text-sm font-semibold px-4 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-50"
        >
          {running ? "Running…" : "Run again"}
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left">
              <th className="px-4 py-3 font-semibold text-slate-700">Service</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Path</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.path} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">{r.label}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-600 break-all">{r.path}</td>
                <td className="px-4 py-3">
                  {r.status == null ? (
                    <span className="text-slate-400">—</span>
                  ) : r.ok ? (
                    <span className="text-teal-700 font-medium">{r.status}</span>
                  ) : (
                    <span className="text-red-700" title={r.detail}>
                      {r.status || "—"}
                      {r.detail ? <span className="block text-xs text-slate-500 font-normal mt-0.5">{r.detail}</span> : null}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Link to="/settings" className="text-primary text-sm font-semibold hover:underline">
        Back to settings
      </Link>
    </div>
  );
}
