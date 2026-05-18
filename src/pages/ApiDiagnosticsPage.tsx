import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ApiError, apiGet } from "@/lib/api";

type PlatformProbe = {
  key: string;
  label: string;
  target: string;
  ok: boolean;
  status: number;
  error: string | null;
};

type PlatformPayload = {
  at?: string;
  gateway?: { ok?: boolean; service?: string };
  probes?: PlatformProbe[];
};

export default function ApiDiagnosticsPage() {
  const [probes, setProbes] = useState<PlatformProbe[]>([]);
  const [checkedAt, setCheckedAt] = useState<string | null>(null);
  const [gatewayOk, setGatewayOk] = useState<boolean | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);

  const run = useCallback(async () => {
    setRunning(true);
    setLoadError(null);
    try {
      const raw = (await apiGet("/api/v1/platform/service-probes")) as PlatformPayload;
      setProbes(Array.isArray(raw.probes) ? raw.probes : []);
      setCheckedAt(typeof raw.at === "string" ? raw.at : null);
      setGatewayOk(raw.gateway?.ok === true);
    } catch (e) {
      setProbes([]);
      setCheckedAt(null);
      setGatewayOk(null);
      setLoadError(
        e instanceof ApiError
          ? e.message
          : e instanceof Error
            ? e.message
            : "Could not load service probes.",
      );
    } finally {
      setRunning(false);
    }
  }, []);

  useEffect(() => {
    void run();
  }, [run]);

  return (
    <div className="p-gutter max-w-4xl space-y-6 pb-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-h2 text-primary">API &amp; services</h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Platform view of the API gateway and each microservice&apos;s{" "}
            <code className="text-xs bg-slate-100 px-1 rounded">/health</code> endpoint. This does not use your personal
            case or workflow permissions — it only checks that the gateway can reach each service.
          </p>
          {checkedAt ? (
            <p className="text-xs text-slate-500 mt-2">Last check: {new Date(checkedAt).toLocaleString()}</p>
          ) : null}
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

      {gatewayOk != null && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            gatewayOk ? "bg-teal-50 border-teal-200 text-teal-900" : "bg-slate-50 border-slate-200 text-slate-700"
          }`}
        >
          <span className="font-semibold">Gateway</span>
          {gatewayOk ? " — reporting; downstream rows show each service." : " — status partial or unknown."}
        </div>
      )}

      {loadError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm px-4 py-3">{loadError}</div>
      ) : null}

      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left">
              <th className="px-4 py-3 font-semibold text-slate-700">Service</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Health URL</th>
              <th className="px-4 py-3 font-semibold text-slate-700">HTTP</th>
              <th className="px-4 py-3 font-semibold text-slate-700">Result</th>
            </tr>
          </thead>
          <tbody>
            {probes.length === 0 && !running && !loadError ? (
              <tr>
                <td colSpan={4} className="px-4 py-6 text-slate-500 text-center">
                  No probe data yet.
                </td>
              </tr>
            ) : null}
            {probes.map((r) => (
              <tr key={r.key} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium text-slate-800">{r.label}</td>
                <td className="px-3 py-2 font-mono text-xs text-slate-600 break-all">{r.target}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  {r.status > 0 ? (
                    <span className={r.ok ? "text-teal-700 font-medium" : "text-red-700 font-medium"}>{r.status}</span>
                  ) : (
                    <span className="text-slate-400">—</span>
                  )}
                </td>
                <td className="px-4 py-3">
                  {r.ok ? (
                    <span className="text-teal-700 font-medium">Reachable</span>
                  ) : (
                    <span className="text-red-700">
                      Unreachable or unhealthy
                      {r.error ? (
                        <span className="block text-xs text-slate-600 font-normal mt-0.5">{r.error}</span>
                      ) : null}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-sm text-slate-600">
        <Link to="/dashboard" className="text-primary font-semibold hover:underline">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
