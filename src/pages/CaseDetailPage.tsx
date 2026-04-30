import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { StubNavItem } from "../components/StubNavItem";


const DEMO = {
  id: "CAS-2024-0892",
  title: "Inter-Agency Financial Discrepancy Analysis",
  subtitle: "Initiated by Treasury Intelligence Group • May 14, 2024",
  badge: "IN REVIEW",
  overview:
    "Detailed examination of multi-agency fund distribution for the Q3 fiscal period. Preliminary findings suggest a variance of 4.2% across three regional offices. Immediate resolution required to maintain inter-agency liquidity standards.",
} as const;

type Tab = "summary" | "activity" | "referrals" | "attachments";

export default function CaseDetailPage() {
  const { caseId } = useParams();
  const decodedId = useMemo(() => (caseId ? decodeURIComponent(caseId) : ""), [caseId]);
  const displayId = decodedId || DEMO.id;
  const [tab, setTab] = useState<Tab>("summary");

  return (
    <div className="flex-1 p-lg max-w-7xl w-full mx-auto pb-10">
      <div className="mb-lg">
        <nav className="flex text-label-caps text-secondary mb-2 uppercase tracking-widest flex-wrap gap-x-1">
          <Link to="/cases" className="hover:text-primary">
            Cases
          </Link>
          <span className="mx-2">/</span>
          <span>Federal Audit</span>
          <span className="mx-2">/</span>
          <span className="text-primary font-bold">{displayId}</span>
        </nav>
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h1 className="font-h1 text-h1 text-primary mb-1">{DEMO.title}</h1>
            <p className="font-body-md text-secondary">{DEMO.subtitle}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className="px-3 py-1 bg-tertiary-fixed text-on-tertiary-fixed-variant rounded-full text-label-caps font-bold">
              {DEMO.badge}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                title="Demo only — not connected to a backend"
                className="bg-primary text-on-primary px-4 py-2 rounded font-label-caps flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-sm">share</span>
                EXPORT DOSSIER
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-xl overflow-hidden min-h-[600px] flex flex-col">
        <div className="flex border-b border-outline-variant bg-surface-container-low overflow-x-auto">
          <TabBtn id="summary" active={tab} setTab={setTab} label="SUMMARY" />
          <TabBtn id="activity" active={tab} setTab={setTab} label="ACTIVITY LOG" />
          <TabBtn id="referrals" active={tab} setTab={setTab} label="REFERRALS (4)" />
          <TabBtn id="attachments" active={tab} setTab={setTab} label="ATTACHMENTS (12)" />
        </div>

        {tab === "summary" && (
          <div className="p-lg grid grid-cols-12 gap-lg flex-1">
            <div className="col-span-12 lg:col-span-8 grid grid-cols-2 gap-md">
              <div className="col-span-2 bg-white border border-outline-variant p-md rounded-lg">
                <h3 className="font-label-caps text-secondary mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">info</span>
                  CASE OVERVIEW
                </h3>
                <p className="font-body-md text-on-surface leading-relaxed mb-4">{DEMO.overview}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-lg border-t border-surface-variant pt-4">
                  <div>
                    <span className="text-label-caps text-secondary block mb-1">PRIORITY LEVEL</span>
                    <span className="font-system-id text-error font-bold flex items-center gap-1">
                      <span className="material-symbols-outlined text-xs">priority_high</span>
                      HIGH
                    </span>
                  </div>
                  <div>
                    <span className="text-label-caps text-secondary block mb-1">SECURITY CLEARANCE</span>
                    <span className="font-system-id text-on-surface">LEVEL 4 - TOP SECRET</span>
                  </div>
                  <div>
                    <span className="text-label-caps text-secondary block mb-1">DEADLINE</span>
                    <span className="font-system-id text-on-surface">JUN 12, 2024</span>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-outline-variant p-md rounded-lg">
                <h3 className="font-label-caps text-secondary mb-3">PRIMARY CONTACT</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm shrink-0">
                    JD
                  </div>
                  <div>
                    <p className="font-body-sm font-bold text-on-surface">Jameson Daltry</p>
                    <p className="text-xs text-secondary">Director of Compliance</p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-outline-variant p-md rounded-lg">
                <h3 className="font-label-caps text-secondary mb-3">LEAD AGENCY</h3>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-teal-700 bg-teal-50 p-2 rounded">account_balance</span>
                  <div>
                    <p className="font-body-sm font-bold text-on-surface">Treasury Intelligence</p>
                    <p className="text-xs text-secondary">Washington D.C. HQ</p>
                  </div>
                </div>
              </div>
              <div className="col-span-2 bg-slate-50 border border-dashed border-outline rounded-lg p-lg flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-4xl text-outline mb-2">monitoring</span>
                <h4 className="font-h3 text-on-surface">Inter-Agency Data Visualization</h4>
                <p className="text-body-sm text-secondary max-w-md">
                  Connect to the Secure Network to view live fund flow diagrams and agency discrepancy heatmaps.
                </p>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 flex flex-col gap-lg">
              <div className="bg-primary-container p-md rounded-lg border border-primary text-on-primary-container">
                <h3 className="font-label-caps text-on-primary-container border-b border-primary/20 pb-2 mb-4 flex justify-between items-center">
                  WORKFLOW ACTION
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                    bolt
                  </span>
                </h3>
                <div className="flex flex-col gap-2">
                  {["ESCALATE TO DIRECTOR", "ASSIGN FOR LEGAL REVIEW", "REQUEST ADDITIONAL DATA"].map((label) => (
                    <button
                      key={label}
                      type="button"
                      title="Demo workflow action — not wired to an API"
                      className="w-full py-3 bg-white text-primary font-bold text-label-caps rounded border border-primary/10 shadow-sm hover:bg-primary-container hover:text-white transition-all flex justify-between px-4 items-center group"
                    >
                      {label}
                      <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">
                        arrow_forward
                      </span>
                    </button>
                  ))}
                </div>
                <div className="mt-4 pt-4 border-t border-primary/20">
                  <p className="text-xs italic opacity-80">
                    Current state: Awaiting Departmental Approval since 2024-05-18 09:44 AM
                  </p>
                </div>
              </div>
              <div className="bg-white border border-outline-variant p-md rounded-lg">
                <h3 className="font-label-caps text-secondary mb-4">RELATED ENTITIES</h3>
                <ul className="space-y-3">
                  <li>
                    <StubNavItem className="w-full flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-secondary">description</span>
                        <span className="text-body-sm font-medium">Q3 Audit-Final.pdf</span>
                      </div>
                      <span className="material-symbols-outlined text-xs text-outline" aria-hidden>
                        download
                      </span>
                    </StubNavItem>
                  </li>
                  <li>
                    <StubNavItem className="w-full flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className="material-symbols-outlined text-secondary">account_tree</span>
                        <span className="text-body-sm font-medium">Hierarchy Map</span>
                      </div>
                      <span className="material-symbols-outlined text-xs text-outline" aria-hidden>
                        open_in_new
                      </span>
                    </StubNavItem>
                  </li>
                </ul>
              </div>
              <div className="bg-white border border-outline-variant p-md rounded-lg flex-1">
                <h3 className="font-label-caps text-secondary mb-4">RECENT ACTIVITY</h3>
                <div className="space-y-4">
                  <div className="flex gap-3 border-l-2 border-primary-fixed pl-3 py-1">
                    <div>
                      <p className="font-system-id text-xs text-primary">USER_7782</p>
                      <p className="text-body-sm">Added 4 attachments</p>
                      <p className="text-[10px] text-secondary font-mono">2024-05-20 14:22:10</p>
                    </div>
                  </div>
                  <div className="flex gap-3 border-l-2 border-outline-variant pl-3 py-1">
                    <div>
                      <p className="font-system-id text-xs text-secondary">SYS_AUDIT</p>
                      <p className="text-body-sm">Automated sanity check: PASSED</p>
                      <p className="text-[10px] text-secondary font-mono">2024-05-20 09:00:00</p>
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  title="Demo only — audit UI not wired yet"
                  className="w-full mt-4 text-center text-label-caps text-primary hover:underline"
                >
                  VIEW FULL AUDIT TRAIL
                </button>
              </div>
            </div>
          </div>
        )}

        {tab !== "summary" && (
          <div className="p-xl text-center text-secondary font-body-md">
            <span className="material-symbols-outlined text-4xl text-outline mb-2 inline-block">construction</span>
            <p>
              “{tab}” is not implemented yet — connect this tab to your API when wiring case data for{" "}
              <strong className="text-primary">{displayId}</strong>.
            </p>
          </div>
        )}
      </div>

      <footer className="mt-lg flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center text-xs text-secondary opacity-60">
        <div className="flex flex-wrap gap-4">
          <span>© 2024 Institutional Agency Case Management System</span>
          <span>Version 4.2.1-stable</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-xs">lock</span>
          <span>End-to-End Encrypted Session</span>
        </div>
      </footer>
    </div>
  );
}

function TabBtn({
  id,
  active,
  setTab,
  label,
}: {
  id: Tab;
  active: Tab;
  setTab: (t: Tab) => void;
  label: string;
}) {
  const isActive = active === id;
  return (
    <button
      type="button"
      onClick={() => setTab(id)}
      className={`px-lg py-4 font-label-caps shrink-0 transition-colors ${
        isActive ? "text-primary border-b-2 border-primary bg-white" : "text-secondary hover:text-primary bg-transparent"
      }`}
    >
      {label}
    </button>
  );
}
