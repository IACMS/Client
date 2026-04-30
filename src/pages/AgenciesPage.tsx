import { Link } from "react-router-dom";
import { DEMO_AGENCIES } from "@/data/demoAgencies";

function Stat({
  label,
  value,
  sub,
  hint,
  hintIcon,
  hintClass,
  valueClass = "text-primary",
}: {
  label: string;
  value: string;
  sub?: string;
  hint?: string;
  hintIcon?: string;
  hintClass?: string;
  valueClass?: string;
}) {
  return (
    <div className="bg-white p-lg border border-outline-variant rounded-xl flex flex-col gap-1">
      <span className="font-label-caps text-slate-500">{label}</span>
      <span className={`font-h2 ${valueClass}`}>{value}</span>
      {hint ? (
        <span className={`text-xs font-medium flex items-center gap-1 ${hintClass ?? "text-green-600"}`}>
          {hintIcon && <span className="material-symbols-outlined text-xs">{hintIcon}</span>}
          {hint}
        </span>
      ) : (
        <span className="text-xs text-slate-500 font-medium">{sub}</span>
      )}
    </div>
  );
}

export default function AgenciesPage() {
  const totalCases = DEMO_AGENCIES.reduce((n, a) => n + a.openCases, 0);
  const provisioning = DEMO_AGENCIES.filter((a) => a.status === "PROVISIONING").length;

  return (
    <div className="p-gutter max-w-7xl mx-auto w-full pb-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-slate-500 font-label-caps text-xs mb-2 flex-wrap">
          <span>PORTAL</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span>INTER-AGENCY NETWORK</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">AGENCY DIRECTORY</span>
        </div>
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="font-h1 text-primary">Partner Agency Registry</h1>
            <p className="font-body-md text-slate-600 mt-1">
              Federated roster of tenants, liaisons, and data-sharing posture across the institutional mesh.
            </p>
          </div>
          <button
            type="button"
            title="Demo only — provisioning workflow not wired"
            className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-primary-container transition-all shadow-sm cursor-default"
          >
            <span className="material-symbols-outlined">domain_add</span>
            Request partnership
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-8">
        <Stat label="REGISTERED PARTNERS" value={String(DEMO_AGENCIES.length)} sub="Active + provisioning" />
        <Stat label="OPEN CASES (ALL)" value={totalCases.toLocaleString()} sub="Across listed agencies" valueClass="text-teal-700" />
        <Stat
          label="ACTIVE SYNC"
          value={String(DEMO_AGENCIES.filter((a) => a.status === "ACTIVE").length)}
          hint="Real-time data channels"
          hintIcon="sync"
          hintClass="text-teal-600"
        />
        <div className="bg-white p-lg border border-outline-variant rounded-xl flex flex-col gap-1">
          <span className="font-label-caps text-slate-500">PROVISIONING</span>
          <span className="font-h2 text-amber-700">{provisioning}</span>
          <span className="text-xs text-slate-500 font-medium">Agencies completing onboarding</span>
        </div>
      </div>

      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden">
        <div className="p-lg border-b border-outline-variant bg-slate-50 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input
                className="pl-10 pr-4 py-2 border border-outline rounded-lg text-sm w-full sm:w-80 focus:ring-primary focus:border-primary"
                placeholder="Search by agency name, code, or liaison..."
                type="search"
                aria-label="Search agencies"
              />
            </div>
            <div className="hidden sm:block h-8 w-px bg-slate-300" />
            <select className="border border-outline rounded-lg text-sm py-2 px-3 focus:ring-primary focus:border-primary bg-white" aria-label="Jurisdiction filter">
              <option>All jurisdictions</option>
              <option>Federal</option>
              <option>State</option>
              <option>Federal task force</option>
            </select>
            <select className="border border-outline rounded-lg text-sm py-2 px-3 focus:ring-primary focus:border-primary bg-white" aria-label="Status filter">
              <option>All statuses</option>
              <option>Active</option>
              <option>Provisioning</option>
              <option>Read-only</option>
            </select>
            <button type="button" className="flex items-center gap-2 px-3 py-2 border border-outline rounded-lg text-sm font-medium hover:bg-slate-100 bg-white">
              <span className="material-symbols-outlined text-sm">download</span>
              Export roster
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button type="button" className="flex items-center gap-2 px-3 py-2 text-primary font-semibold hover:bg-primary-container/10 rounded-lg">
              <span className="material-symbols-outlined text-sm">tune</span>
              SLA filters
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[900px]">
            <thead className="bg-primary text-white">
              <tr>
                {["CODE", "AGENCY NAME", "JURISDICTION", "REGION / HQ", "LIAISON", "STATUS", "LINKED CASES", "LAST SYNC", "PROFILE"].map(
                  (h) => (
                    <th
                      key={h}
                      className={`p-md font-label-caps tracking-widest text-xs ${h === "PROFILE" ? "text-right" : ""}`}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {DEMO_AGENCIES.map((a, i) => (
                <tr key={a.slug} className={`${i % 2 === 1 ? "bg-surface-container-low " : ""}hover:bg-slate-50 transition-colors`}>
                  <td className="p-md font-system-id font-bold text-teal-800">{a.acronym}</td>
                  <td className="p-md font-body-sm font-semibold text-slate-900">{a.name}</td>
                  <td className="p-md font-body-sm text-slate-700">{a.jurisdictionType}</td>
                  <td className="p-md font-body-sm text-slate-600 max-w-[200px]">{a.regionHq}</td>
                  <td className="p-md font-body-sm text-slate-700">{a.liaisonName}</td>
                  <td className="p-md">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${a.statusClass}`}>{a.status.replace("_", " ")}</span>
                  </td>
                  <td className="p-md font-body-sm font-semibold text-slate-800">{a.openCases.toLocaleString()}</td>
                  <td className="p-md font-body-sm text-slate-500">{a.lastSync}</td>
                  <td className="p-md text-right">
                    <Link to={`/agencies/${encodeURIComponent(a.slug)}`} className="text-primary hover:text-teal-700 font-semibold text-sm">
                      Open profile
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-lg border-t border-outline-variant bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-500">
            Showing{" "}
            <span className="font-bold text-slate-700">
              1-{DEMO_AGENCIES.length}
            </span>{" "}
            of <span className="font-bold text-slate-700">{DEMO_AGENCIES.length}</span> agencies
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <span className="material-symbols-outlined text-base text-slate-400">info</span>
            Demo roster — connect to your tenant registry API when ready.
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-gutter">
        <div className="bg-white border border-outline-variant rounded-xl p-lg">
          <h3 className="font-h3 text-primary mb-4 flex items-center gap-2">
            <span className="material-symbols-outlined">verified</span>
            Data-sharing posture
          </h3>
          <p className="font-body-md text-slate-600 mb-6">
            Each partner signs a bilateral or mesh agreement before elevated case payloads cross agency boundaries.
          </p>
          <ul className="space-y-4">
            <li className="flex gap-3 border-l-2 border-teal-600 pl-3">
              <div>
                <p className="font-label-caps text-xs text-slate-500">TIER A</p>
                <p className="font-body-sm font-semibold text-slate-900">Full operational sync</p>
                <p className="text-xs text-slate-500">Eligible for escalation routing and dossier export.</p>
              </div>
            </li>
            <li className="flex gap-3 border-l-2 border-amber-500 pl-3">
              <div>
                <p className="font-label-caps text-xs text-slate-500">TIER B</p>
                <p className="font-body-sm font-semibold text-slate-900">Limited intake</p>
                <p className="text-xs text-slate-500">Referrals accepted; reciprocal discovery pending clearance.</p>
              </div>
            </li>
          </ul>
        </div>
        <div className="bg-primary-container text-white rounded-xl p-lg flex flex-col justify-between overflow-hidden relative min-h-[260px]">
          <div className="relative z-10">
            <h3 className="font-h3 mb-2">Network health</h3>
            <p className="text-teal-100 font-body-sm mb-6">
              Institutional mesh latency and acknowledgment targets (demo placeholders).
            </p>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-teal-200 font-label-caps text-xs block">AVG ROUND-TRIP</span>
                <span className="font-h2 text-white">412ms</span>
              </div>
              <div>
                <span className="text-teal-200 font-label-caps text-xs block">ACK WITHIN SLA</span>
                <span className="font-h2 text-white">97.8%</span>
              </div>
            </div>
          </div>
          <span className="material-symbols-outlined absolute -right-8 -bottom-8 text-[180px] opacity-15 pointer-events-none">hub</span>
        </div>
      </div>
    </div>
  );
}
