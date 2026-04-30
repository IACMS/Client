import { Link } from "react-router-dom";

const rows = [
  {
    id: "CAS-2024-0089",
    subject: "Maritime Border Regulation Audit",
    agency: "Federal Customs Authority",
    status: "ACTIVE",
    statusClass: "bg-blue-50 text-blue-700 border-blue-200",
    priority: "NORMAL",
    priorityClass: "text-slate-700",
    dot: "bg-slate-400",
    updated: "2024-05-12 14:20",
    zebra: false,
  },
  {
    id: "CAS-2024-0102",
    subject: "Inter-State Transit Discrepancy",
    agency: "Transport Security Admin",
    status: "ESCALATED",
    statusClass: "bg-red-50 text-red-700 border-red-200",
    priority: "CRITICAL",
    priorityClass: "text-error",
    dot: "bg-error",
    updated: "2 hours ago",
    zebra: true,
  },
  {
    id: "CAS-2024-0105",
    subject: "Annual Compliance Review: Sector 7",
    agency: "Internal Audit Agency",
    status: "PENDING",
    statusClass: "bg-amber-50 text-amber-700 border-amber-200",
    priority: "HIGH",
    priorityClass: "text-amber-700",
    dot: "bg-amber-400",
    updated: "2024-05-11 09:15",
    zebra: false,
  },
  {
    id: "CAS-2024-0094",
    subject: "Environmental Impact Assessment",
    agency: "State Resource Board",
    status: "RESOLVED",
    statusClass: "bg-green-50 text-green-700 border-green-200",
    priority: "LOW",
    priorityClass: "text-slate-700",
    dot: "bg-slate-400",
    updated: "Yesterday",
    zebra: true,
  },
  {
    id: "CAS-2024-0112",
    subject: "Digital Infrastructure Security Log",
    agency: "Cyber Intelligence Unit",
    status: "ACTIVE",
    statusClass: "bg-blue-50 text-blue-700 border-blue-200",
    priority: "HIGH",
    priorityClass: "text-amber-700",
    dot: "bg-amber-400",
    updated: "10 mins ago",
    zebra: false,
  },
];

export default function CasesPage() {
  return (
    <div className="p-gutter max-w-7xl mx-auto w-full pb-10">
      <div className="mb-8">
        <div className="flex items-center gap-2 text-slate-500 font-label-caps text-xs mb-2 flex-wrap">
          <span>PORTAL</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span>CASE MANAGEMENT</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">ALL CASES</span>
        </div>
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h1 className="font-h1 text-primary">Inter-Agency Case Listing</h1>
            <p className="font-body-md text-slate-600 mt-1">Review and manage cross-departmental enforcement actions.</p>
          </div>
          <button
            type="button"
            className="bg-primary text-white px-6 py-2.5 rounded-lg font-semibold flex items-center gap-2 hover:bg-primary-container transition-all shadow-sm"
          >
            <span className="material-symbols-outlined">add</span>
            Create Case
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-gutter mb-8">
        <Stat label="TOTAL CASES" value="1,429" hint="+12% from last month" hintIcon="trending_up" hintClass="text-green-600" />
        <Stat label="PENDING REVIEW" value="84" sub="Requiring primary assignment" valueClass="text-tertiary" />
        <Stat label="ACTIVE INVESTIGATIONS" value="312" sub="Inter-agency status" valueClass="text-teal-600" />
        <div className="bg-white p-lg border border-outline-variant rounded-xl flex flex-col gap-1">
          <span className="font-label-caps text-slate-500">ESCALATED</span>
          <span className="font-h2 text-error">12</span>
          <span className="text-xs text-error font-medium flex items-center gap-1">
            <span className="material-symbols-outlined text-xs">priority_high</span>
            Immediate attention
          </span>
        </div>
      </div>

      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden">
        <div className="p-lg border-b border-outline-variant bg-slate-50 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">search</span>
              <input
                className="pl-10 pr-4 py-2 border border-outline rounded-lg text-sm w-full sm:w-80 focus:ring-primary focus:border-primary"
                placeholder="Search by Case ID or Subject..."
                type="search"
                aria-label="Search cases"
              />
            </div>
            <div className="hidden sm:block h-8 w-px bg-slate-300" />
            <select className="border border-outline rounded-lg text-sm py-2 px-3 focus:ring-primary focus:border-primary bg-white" aria-label="Status filter">
              <option>All Statuses</option>
              <option>Open</option>
              <option>Pending</option>
              <option>Escalated</option>
              <option>Resolved</option>
            </select>
            <select className="border border-outline rounded-lg text-sm py-2 px-3 focus:ring-primary focus:border-primary bg-white" aria-label="Agency filter">
              <option>All Agencies</option>
              <option>Federal Bureau</option>
              <option>State Authority</option>
              <option>Local Compliance</option>
            </select>
            <button type="button" className="flex items-center gap-2 px-3 py-2 border border-outline rounded-lg text-sm font-medium hover:bg-slate-100 bg-white">
              <span className="material-symbols-outlined text-sm">calendar_today</span>
              Date Range
            </button>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center border border-outline rounded-lg p-1 bg-white">
              <button type="button" className="px-2 py-1 bg-slate-100 rounded text-slate-700" title="Compact">
                <span className="material-symbols-outlined text-sm">density_medium</span>
              </button>
              <button type="button" className="px-2 py-1 text-slate-400 hover:text-slate-600" title="Comfortable">
                <span className="material-symbols-outlined text-sm">density_small</span>
              </button>
            </div>
            <button type="button" className="flex items-center gap-2 px-3 py-2 text-primary font-semibold hover:bg-primary-container/10 rounded-lg">
              <span className="material-symbols-outlined text-sm">filter_list</span>
              Advanced Filters
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[880px]">
            <thead className="bg-primary text-white">
              <tr>
                {["CASE ID", "SUBJECT", "ASSIGNED AGENCY", "STATUS", "PRIORITY", "LAST UPDATED", "ACTIONS"].map((h) => (
                  <th
                    key={h}
                    className={`p-md font-label-caps tracking-widest text-xs ${h === "ACTIONS" ? "text-right" : ""}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {rows.map((r) => (
                <tr key={r.id} className={`${r.zebra ? "bg-surface-container-low " : ""}hover:bg-slate-50 transition-colors`}>
                  <td className="p-md font-system-id text-slate-600">{r.id}</td>
                  <td className="p-md font-body-sm font-semibold text-slate-900">{r.subject}</td>
                  <td className="p-md font-body-sm text-slate-700">{r.agency}</td>
                  <td className="p-md">
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${r.statusClass}`}>{r.status}</span>
                  </td>
                  <td className="p-md">
                    <span className={`flex items-center gap-1.5 text-xs font-bold ${r.priorityClass}`}>
                      <span className={`w-2 h-2 rounded-full ${r.dot}`} />
                      {r.priority}
                    </span>
                  </td>
                  <td className="p-md font-body-sm text-slate-500">{r.updated}</td>
                  <td className="p-md text-right">
                    <Link
                      to={`/cases/${encodeURIComponent(r.id)}`}
                      className="text-primary hover:text-teal-700 font-semibold text-sm"
                    >
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-lg border-t border-outline-variant bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm text-slate-500">
            Showing <span className="font-bold text-slate-700">1-5</span> of{" "}
            <span className="font-bold text-slate-700">1,429</span> cases
          </div>
          <div className="flex items-center gap-2">
            <button type="button" className="w-8 h-8 flex items-center justify-center rounded border border-outline text-slate-400 hover:bg-slate-100 disabled:opacity-50" disabled>
              <span className="material-symbols-outlined text-sm">chevron_left</span>
            </button>
            <button type="button" className="w-8 h-8 flex items-center justify-center rounded border-2 border-primary bg-primary text-white text-sm font-bold">
              1
            </button>
            <button type="button" className="w-8 h-8 flex items-center justify-center rounded border border-outline text-slate-700 hover:bg-slate-100 text-sm font-bold">
              2
            </button>
            <button type="button" className="w-8 h-8 flex items-center justify-center rounded border border-outline text-slate-700 hover:bg-slate-100 text-sm font-bold">
              3
            </button>
            <span className="text-slate-400 mx-1">...</span>
            <button type="button" className="w-8 h-8 flex items-center justify-center rounded border border-outline text-slate-700 hover:bg-slate-100 text-sm font-bold">
              286
            </button>
            <button type="button" className="w-8 h-8 flex items-center justify-center rounded border border-outline text-slate-700 hover:bg-slate-100">
              <span className="material-symbols-outlined text-sm">chevron_right</span>
            </button>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            Rows per page:
            <select className="border-none bg-transparent font-bold text-slate-700 focus:ring-0 cursor-pointer" aria-label="Rows per page">
              <option>10</option>
              <option>25</option>
              <option>50</option>
              <option>100</option>
            </select>
          </div>
        </div>
      </div>

      <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-gutter">
        <div className="lg:col-span-2 bg-white border border-outline-variant rounded-xl p-lg">
          <h3 className="font-h3 text-primary mb-6 flex items-center gap-2">
            <span className="material-symbols-outlined">history</span>
            Recent System Activity
          </h3>
          <div className="space-y-6 relative before:content-[''] before:absolute before:left-3 before:top-2 before:bottom-2 before:w-px before:bg-slate-200">
            <TimelineDot color="bg-teal-500" ring="ring-teal-50" title="Case CAS-2024-0112 Created" desc="New high-priority investigation logged by Cyber Intelligence Unit." time="10:45 AM · UID-992831" />
            <TimelineDot color="bg-amber-500" ring="ring-amber-50" title="Status Change: CAS-2024-0102" desc="Priority updated to CRITICAL following inter-agency directive 4-B." time="09:12 AM · UID-102934" />
            <TimelineDot color="bg-slate-300" ring="ring-slate-50" title="Report Generated: Sector 4 Audit" desc="Monthly compliance PDF distributed to State Authority stakeholders." time="Yesterday · UID-AUTO-GEN" />
          </div>
        </div>
        <div className="bg-primary-container text-white rounded-xl p-lg flex flex-col justify-between overflow-hidden relative min-h-[280px]">
          <div className="relative z-10">
            <h3 className="font-h3 mb-2">Agency Performance</h3>
            <p className="text-teal-100 font-body-sm mb-6">Real-time throughput metrics across all institutional partners.</p>
            <div className="space-y-4">
              <PerfBar label="FEDERAL BUREAU" pct={92} />
              <PerfBar label="STATE AUTHORITY" pct={78} />
              <PerfBar label="LOCAL COMPLIANCE" pct={64} />
            </div>
          </div>
          <div className="absolute top-0 right-0 -mr-16 -mt-16 opacity-10 pointer-events-none">
            <span className="material-symbols-outlined text-[200px]">account_balance</span>
          </div>
        </div>
      </div>
    </div>
  );
}

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

function TimelineDot({
  color,
  ring,
  title,
  desc,
  time,
}: {
  color: string;
  ring: string;
  title: string;
  desc: string;
  time: string;
}) {
  return (
    <div className="relative pl-10">
      <div className={`absolute left-1.5 top-1.5 w-3 h-3 rounded-full ${color} border-2 border-white ring-4 ${ring}`} />
      <div className="font-body-sm font-bold text-slate-900">{title}</div>
      <div className="font-body-sm text-slate-600">{desc}</div>
      <div className="font-system-id text-xs text-slate-400 mt-1 uppercase">{time}</div>
    </div>
  );
}

function PerfBar({ label, pct }: { label: string; pct: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-bold mb-1">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full bg-white/20 h-1.5 rounded-full">
        <div className="bg-white h-full rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
