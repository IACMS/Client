import { useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import { getAgencyBySlug } from "@/data/demoAgencies";

export default function AgencyDetailPage() {
  const { agencySlug } = useParams();
  const slug = useMemo(() => {
    const raw = agencySlug ? decodeURIComponent(agencySlug) : "";
    return raw.trim().toLowerCase();
  }, [agencySlug]);

  const agency = useMemo(() => (slug ? getAgencyBySlug(slug) : undefined), [slug]);

  if (!agency) {
    return (
      <div className="p-gutter max-w-3xl mx-auto w-full pb-10">
        <div className="bg-white border border-outline-variant rounded-xl p-xl text-center">
          <span className="material-symbols-outlined text-5xl text-slate-300 mb-4 inline-block">travel_explore</span>
          <h1 className="font-h2 text-primary mb-2">Agency not found</h1>
          <p className="font-body-md text-slate-600 mb-6">
            No partner profile matches <span className="font-mono text-sm bg-slate-100 px-2 py-0.5 rounded">{agencySlug ?? "—"}</span>.
          </p>
          <Link to="/agencies" className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-primary-container transition-colors">
            <span className="material-symbols-outlined text-sm">arrow_back</span>
            Back to directory
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-gutter max-w-7xl mx-auto w-full pb-10">
      <div className="mb-lg">
        <nav className="flex text-label-caps text-slate-500 mb-2 uppercase tracking-widest flex-wrap gap-x-1 items-center">
          <Link to="/agencies" className="hover:text-primary">
            Agencies
          </Link>
          <span className="mx-2">/</span>
          <span>{agency.acronym}</span>
          <span className="mx-2">/</span>
          <span className="text-primary font-bold">{agency.name}</span>
        </nav>
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h1 className="font-h1 text-primary mb-1">{agency.name}</h1>
            <p className="font-body-md text-slate-600">
              {agency.jurisdictionType} · {agency.regionHq}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1 rounded-full text-label-caps font-bold border ${agency.statusClass}`}>{agency.status.replace("_", " ")}</span>
            <span className="text-xs font-system-id text-slate-400">{agency.tier}</span>
            <div className="flex gap-2 flex-wrap justify-end">
              <button
                type="button"
                title="Demo only — messaging not wired"
                className="bg-primary text-on-primary px-4 py-2 rounded-lg font-label-caps flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity"
              >
                <span className="material-symbols-outlined text-sm">mail</span>
                Contact liaison
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white border border-outline-variant rounded-xl overflow-hidden min-h-[480px] flex flex-col mb-lg">
        <div className="flex border-b border-outline-variant bg-slate-50 overflow-x-auto">
          {["OVERVIEW", "CASES & WORKLOAD", "COMPLIANCE"].map((label, i) => (
            <button
              key={label}
              type="button"
              className={`px-lg py-4 font-label-caps shrink-0 transition-colors ${
                i === 0 ? "text-primary border-b-2 border-primary bg-white" : "text-slate-500 hover:text-primary bg-transparent"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="p-lg grid grid-cols-12 gap-lg flex-1">
          <div className="col-span-12 lg:col-span-8 space-y-lg">
            <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-lg">
              <h3 className="font-label-caps text-slate-500 mb-3 flex items-center gap-2">
                <span className="material-symbols-outlined text-sm">info</span>
                MISSION PROFILE
              </h3>
              <p className="font-body-md text-on-surface leading-relaxed">{agency.description}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-md border-t border-slate-200 pt-4 mt-4">
                <div>
                  <span className="text-label-caps text-slate-500 block mb-1">HEADQUARTERS</span>
                  <span className="font-body-sm text-slate-800">{agency.address}</span>
                </div>
                <div>
                  <span className="text-label-caps text-slate-500 block mb-1">DATA SHARING</span>
                  <span className="font-body-sm text-slate-800">{agency.dataSharing}</span>
                </div>
              </div>
            </div>

            <div className="bg-surface-container-lowest border border-outline-variant p-md rounded-lg">
              <h3 className="font-label-caps text-slate-500 mb-4">OPERATIONAL CLEARANCE</h3>
              <div className="grid grid-cols-2 gap-lg">
                <div>
                  <span className="text-label-caps text-slate-500 block mb-1">CLEARANCE TIER</span>
                  <span className="font-system-id font-bold text-teal-800 flex items-center gap-1">
                    <span className="material-symbols-outlined text-xs">shield</span>
                    {agency.clearanceLevel}
                  </span>
                </div>
                <div>
                  <span className="text-label-caps text-slate-500 block mb-1">LAST SYNC</span>
                  <span className="font-system-id text-slate-800">{agency.lastSync}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 flex flex-col gap-lg">
            <div className="bg-primary-container p-md rounded-lg border border-primary text-on-primary-container">
              <h3 className="font-label-caps border-b border-primary/25 pb-2 mb-4">PRIMARY LIAISON</h3>
              <div className="flex gap-3">
                <div className="w-12 h-12 rounded-lg bg-white/15 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-2xl">person</span>
                </div>
                <div>
                  <p className="font-body-sm font-bold">{agency.liaisonName}</p>
                  <p className="text-xs opacity-90">{agency.liaisonRole}</p>
                  <p className="font-mono text-[10px] mt-2 opacity-80 truncate max-w-[220px]">{agency.liaisonEmail}</p>
                </div>
              </div>
            </div>

            <div className="bg-white border border-outline-variant p-md rounded-lg flex-1">
              <h3 className="font-label-caps text-slate-500 mb-4">CASE MESH METRICS</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-sm text-slate-600">Open cases referenced</span>
                  <span className="font-h3 text-primary">{agency.openCases}</span>
                </div>
                <div className="flex justify-between items-center border-b border-slate-100 pb-3">
                  <span className="text-sm text-slate-600">Escalated (network)</span>
                  <span className={`font-h3 ${agency.escalatedCases > 0 ? "text-error" : "text-slate-700"}`}>{agency.escalatedCases}</span>
                </div>
                <Link
                  to="/cases"
                  className="w-full mt-2 text-center py-3 rounded-lg border border-primary text-primary font-label-caps text-sm hover:bg-teal-50 transition-colors flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined text-sm">work</span>
                  View all cases directory
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <footer className="text-xs text-slate-400 flex flex-wrap gap-4 justify-between">
        <span>Profile ID · {agency.slug.toUpperCase()}</span>
        <span>IACMS institutional directory (demo)</span>
      </footer>
    </div>
  );
}
