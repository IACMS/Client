import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import CaseReferralsPanel from "@/components/CaseReferralsPanel";
import { useSession } from "@/context/SessionContext";
import { ApiError, apiGet } from "@/lib/api";
import type { ApiCase } from "@/lib/casesApi";
import { formatCaseUpdated, priorityDisplay, statusBadgeClass } from "@/lib/casesApi";

type CaseDetailResponse = { case?: ApiCase };

type Tab = "summary" | "activity" | "referrals" | "attachments";

export default function CaseDetailPage() {
  const { user } = useSession();
  const { caseId } = useParams();
  const decodedId = useMemo(() => (caseId ? decodeURIComponent(caseId) : ""), [caseId]);
  const [tab, setTab] = useState<Tab>("summary");
  const [caseRow, setCaseRow] = useState<ApiCase | null>(null);
  const [loadState, setLoadState] = useState<"loading" | "ok" | "error">("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!decodedId) {
      setLoadState("error");
      setErrorMessage("Missing case id in URL.");
      return;
    }
    (async () => {
      setLoadState("loading");
      setErrorMessage(null);
      try {
        const data = (await apiGet(`/api/v1/cases/${decodedId}`)) as CaseDetailResponse;
        const c = data.case;
        if (!c) throw new Error("Invalid response: no case");
        if (!cancelled) {
          setCaseRow(c);
          setLoadState("ok");
        }
      } catch (e) {
        if (cancelled) return;
        const msg =
          e instanceof ApiError
            ? e.status === 404
              ? "Case not found."
              : e.message
            : e instanceof Error
              ? e.message
              : "Failed to load case.";
        setErrorMessage(msg);
        setCaseRow(null);
        setLoadState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [decodedId]);

  const attachmentsCount = caseRow?.attachments?.length ?? 0;
  const pr = caseRow ? priorityDisplay(caseRow.priority) : null;

  if (loadState === "loading") {
    return (
      <div className="flex-1 p-lg max-w-7xl w-full mx-auto pb-10 flex flex-col items-center justify-center min-h-[320px] text-slate-600">
        <span className="material-symbols-outlined text-4xl animate-pulse">progress_activity</span>
        <p className="mt-3 font-body-sm">Loading case…</p>
      </div>
    );
  }

  if (loadState === "error" || !caseRow) {
    return (
      <div className="flex-1 p-lg max-w-3xl w-full mx-auto pb-10">
        <div className="bg-white border border-outline-variant rounded-xl p-xl">
          <h1 className="font-h2 text-primary mb-2">Case unavailable</h1>
          <p className="font-body-md text-secondary mb-6">{errorMessage ?? "Unknown error."}</p>
          <Link to="/cases" className="text-primary font-semibold hover:underline">
            ← Back to cases
          </Link>
        </div>
      </div>
    );
  }

  const stClass = statusBadgeClass(caseRow.status);
  const creator = caseRow.creator;
  const creatorName =
    creator && typeof creator === "object" && "firstName" in creator
      ? `${String((creator as { firstName?: string }).firstName ?? "")} ${String((creator as { lastName?: string }).lastName ?? "")}`.trim()
      : "";

  return (
    <div className="flex-1 p-lg max-w-7xl w-full mx-auto pb-10">
      <div className="mb-lg">
        <nav className="flex text-label-caps text-secondary mb-2 uppercase tracking-widest flex-wrap gap-x-1">
          <Link to="/cases" className="hover:text-primary">
            Cases
          </Link>
          <span className="mx-2">/</span>
          <span>{caseRow.tenant?.name ?? "Tenant"}</span>
          <span className="mx-2">/</span>
          <span className="text-primary font-bold">{caseRow.caseNumber}</span>
        </nav>
        <div className="flex justify-between items-start gap-4 flex-wrap">
          <div>
            <h1 className="font-h1 text-h1 text-primary mb-1">{caseRow.title}</h1>
            <p className="font-body-md text-secondary">
              {caseRow.type} · Updated {formatCaseUpdated(caseRow.updatedAt)}
            </p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <span className={`px-3 py-1 rounded-full text-label-caps font-bold border ${stClass}`}>
              {caseRow.status.toUpperCase()}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                title="Export not wired yet"
                className="bg-primary text-on-primary px-4 py-2 rounded font-label-caps flex items-center gap-2 shadow-sm hover:opacity-90 transition-opacity opacity-50 cursor-not-allowed"
                disabled
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
          <TabBtn id="referrals" active={tab} setTab={setTab} label="REFERRALS" />
          <TabBtn
            id="attachments"
            active={tab}
            setTab={setTab}
            label={attachmentsCount > 0 ? `ATTACHMENTS (${attachmentsCount})` : "ATTACHMENTS"}
          />
        </div>

        {tab === "summary" && (
          <div className="p-lg grid grid-cols-12 gap-lg flex-1">
            <div className="col-span-12 lg:col-span-8 grid grid-cols-2 gap-md">
              <div className="col-span-2 bg-white border border-outline-variant p-md rounded-lg">
                <h3 className="font-label-caps text-secondary mb-4 flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm">info</span>
                  CASE OVERVIEW
                </h3>
                <p className="font-body-md text-on-surface leading-relaxed mb-4">
                  {caseRow.description?.trim() ? caseRow.description : "No description provided for this case."}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-lg border-t border-surface-variant pt-4">
                  <div>
                    <span className="text-label-caps text-secondary block mb-1">PRIORITY</span>
                    <span className={`font-system-id font-bold flex items-center gap-1 ${pr?.textClass ?? ""}`}>
                      <span className="material-symbols-outlined text-xs">priority_high</span>
                      {caseRow.priority.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <span className="text-label-caps text-secondary block mb-1">CASE TYPE</span>
                    <span className="font-system-id text-on-surface">{caseRow.type}</span>
                  </div>
                  <div>
                    <span className="text-label-caps text-secondary block mb-1">DUE</span>
                    <span className="font-system-id text-on-surface">
                      {caseRow.dueDate ? formatCaseUpdated(caseRow.dueDate) : "—"}
                    </span>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-outline-variant p-md rounded-lg">
                <h3 className="font-label-caps text-secondary mb-3">CREATOR</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded bg-primary-container flex items-center justify-center text-on-primary-container font-bold text-sm shrink-0">
                    {(creatorName || caseRow.createdBy || "?").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="font-body-sm font-bold text-on-surface">{creatorName || "Unknown"}</p>
                    <p className="text-xs text-secondary font-mono">{caseRow.createdBy}</p>
                  </div>
                </div>
              </div>
              <div className="bg-white border border-outline-variant p-md rounded-lg">
                <h3 className="font-label-caps text-secondary mb-3">TENANT</h3>
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-teal-700 bg-teal-50 p-2 rounded">account_balance</span>
                  <div>
                    <p className="font-body-sm font-bold text-on-surface">{caseRow.tenant?.name ?? "—"}</p>
                    <p className="text-xs text-secondary font-mono">{caseRow.tenant?.code ?? caseRow.tenantId}</p>
                  </div>
                </div>
              </div>
              <div className="col-span-2 bg-slate-50 border border-dashed border-outline rounded-lg p-lg flex flex-col items-center justify-center text-center">
                <span className="material-symbols-outlined text-4xl text-outline mb-2">monitoring</span>
                <h4 className="font-h3 text-on-surface">Case metadata</h4>
                <p className="text-body-sm text-secondary max-w-md font-mono text-xs break-all">
                  id: {caseRow.id}
                </p>
              </div>
            </div>

            <div className="col-span-12 lg:col-span-4 flex flex-col gap-lg">
              <div className="bg-primary-container p-md rounded-lg border border-primary text-on-primary-container">
                <h3 className="font-label-caps text-on-primary-container border-b border-primary/20 pb-2 mb-4 flex justify-between items-center">
                  WORKFLOW
                  <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                    bolt
                  </span>
                </h3>
                <p className="text-sm opacity-90">
                  Workflow actions will appear here when the workflow service is integrated in the UI.
                </p>
                {caseRow.workflowId && (
                  <p className="text-xs mt-2 font-mono break-all opacity-80">workflowId: {caseRow.workflowId}</p>
                )}
              </div>
              <div className="bg-white border border-outline-variant p-md rounded-lg">
                <h3 className="font-label-caps text-secondary mb-4">ATTACHMENTS</h3>
                {attachmentsCount === 0 ? (
                  <p className="text-body-sm text-secondary">No attachments on this case.</p>
                ) : (
                  <ul className="space-y-3">
                    {caseRow.attachments?.map((att) => (
                      <li key={String((att as { id?: string }).id ?? Math.random())}>
                        <span className="text-body-sm font-medium">
                          {String((att as { fileName?: string }).fileName ?? (att as { id?: string }).id ?? "file")}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}

        {tab === "referrals" && (!user?.tenant?.id || !user.id) && (
          <div className="p-xl text-center text-secondary font-body-md">
            <p>Sign in with a tenant to create referrals for this case.</p>
          </div>
        )}
        {tab === "referrals" && user?.tenant?.id && user.id && (
          <CaseReferralsPanel caseId={caseRow.id} fromTenantId={user.tenant.id} userId={user.id} />
        )}

        {tab !== "summary" && tab !== "referrals" && (
          <div className="p-xl text-center text-secondary font-body-md">
            <span className="material-symbols-outlined text-4xl text-outline mb-2 inline-block">construction</span>
            <p>
              “{tab}” is not implemented yet — connect this tab to your API when wiring case id{" "}
              <strong className="text-primary">{caseRow.caseNumber}</strong>.
            </p>
          </div>
        )}
      </div>

      <footer className="mt-lg flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center text-xs text-secondary opacity-60">
        <div className="flex flex-wrap gap-4">
          <span>© 2024 Institutional Agency Case Management System</span>
          <span>Gateway-backed case detail</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-xs">lock</span>
          <span>Session-authenticated request</span>
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
