import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSession } from "@/context/SessionContext";
import CreateCaseModal from "@/components/CreateCaseModal";
import { apiGet } from "@/lib/api";
import type { ApiCase } from "@/lib/casesApi";

function dashCount(value: number | null, loading: boolean): string {
  if (loading) return "…";
  if (value === null) return "—";
  return String(value);
}

export default function DashboardPage() {
  const { user } = useSession();
  const navigate = useNavigate();
  const greeting = [user?.firstName, user?.lastName].filter(Boolean).join(" ") || user?.email || "there";
  const tenantId = user?.tenant?.id ?? "";
  const [createCaseOpen, setCreateCaseOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [caseCount, setCaseCount] = useState<number | null>(null);
  const [referralCount, setReferralCount] = useState<number | null>(null);
  const [workflowCount, setWorkflowCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const results = { cases: null as number | null, ref: null as number | null, wf: null as number | null };
      try {
        const d = (await apiGet("/api/v1/cases")) as { cases?: ApiCase[] };
        results.cases = Array.isArray(d.cases) ? d.cases.length : 0;
      } catch {
        results.cases = null;
      }
      try {
        const d = (await apiGet("/api/v1/referrals")) as { referrals?: unknown[] };
        results.ref = Array.isArray(d.referrals) ? d.referrals.length : 0;
      } catch {
        results.ref = null;
      }
      try {
        const d = (await apiGet("/api/v1/workflows")) as { workflows?: unknown[] };
        results.wf = Array.isArray(d.workflows) ? d.workflows.length : 0;
      } catch {
        results.wf = null;
      }
      if (!cancelled) {
        setCaseCount(results.cases);
        setReferralCount(results.ref);
        setWorkflowCount(results.wf);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
      <div className="p-gutter max-w-7xl mx-auto space-y-gutter pb-8">
        {tenantId && user?.id && (
          <CreateCaseModal
            open={createCaseOpen}
            onClose={() => setCreateCaseOpen(false)}
            tenantId={tenantId}
            userId={user.id}
            onCreated={(caseId) => navigate(`/cases/${encodeURIComponent(caseId)}`)}
          />
        )}
        <div className="flex justify-between items-end flex-wrap gap-4">
          <div>
            <h2 className="font-h2 text-h2 text-primary leading-none">Welcome, {greeting}</h2>
            <p className="text-slate-500 mt-1">
              {user?.tenant?.name ? (
                <>
                  Signed in under tenant <span className="font-semibold text-slate-700">{user.tenant.name}</span> (
                  {user.tenant.code}).
                </>
              ) : (
                "Operational health and inter-agency coordination summary for today."
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              className="px-4 py-2 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">calendar_today</span>
              Last 24 Hours
            </button>
            <button
              type="button"
              disabled={!tenantId || !user?.id}
              onClick={() => setCreateCaseOpen(true)}
              className="px-4 py-2 bg-primary-container text-white rounded-md text-xs font-semibold hover:bg-teal-800 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="material-symbols-outlined text-base">add</span>
              New Case
            </button>
          </div>
        </div>

        <div className="grid grid-cols-12 gap-gutter">
          <div className="col-span-12 md:col-span-4 bg-white p-6 rounded-lg border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-teal-50 rounded-lg">
                <span className="material-symbols-outlined text-teal-700">folder_managed</span>
              </div>
              <Link to="/cases" className="text-[10px] font-bold text-teal-600 bg-teal-50 px-2 py-0.5 rounded-full hover:underline">
                View cases
              </Link>
            </div>
            <h3 className="text-slate-500 text-sm font-label-caps tracking-wider">CASES</h3>
            <p className="text-3xl font-bold text-teal-900 mt-1">{dashCount(caseCount, loading)}</p>
            <p className="mt-4 text-[10px] text-slate-400">
              {caseCount === null && !loading ? "No access or service unavailable." : "Total cases returned from the API."}
            </p>
          </div>

          <div className="col-span-12 md:col-span-4 bg-white p-6 rounded-lg border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-amber-50 rounded-lg">
                <span className="material-symbols-outlined text-amber-600">move_to_inbox</span>
              </div>
            </div>
            <h3 className="text-slate-500 text-sm font-label-caps tracking-wider">REFERRALS</h3>
            <p className="text-3xl font-bold text-teal-900 mt-1">{dashCount(referralCount, loading)}</p>
            <p className="mt-4 text-[10px] text-slate-400">
              {referralCount === null && !loading
                ? "No access or service unavailable."
                : "Referrals visible to your account."}
            </p>
          </div>

          <div className="col-span-12 md:col-span-4 bg-white p-6 rounded-lg border border-slate-200 shadow-sm transition-all hover:shadow-md">
            <div className="flex justify-between items-start mb-4">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <span className="material-symbols-outlined text-emerald-600">account_tree</span>
              </div>
            </div>
            <h3 className="text-slate-500 text-sm font-label-caps tracking-wider">WORKFLOWS</h3>
            <p className="text-3xl font-bold text-teal-900 mt-1">{dashCount(workflowCount, loading)}</p>
            <div className="mt-4 flex items-center gap-1">
              <span className="material-symbols-outlined text-emerald-500 text-xs">bolt</span>
              <span className="text-[10px] text-slate-400">
                {workflowCount === null && !loading ? "No access or service unavailable." : "Active workflow definitions."}
              </span>
            </div>
          </div>

          <div className="col-span-12 lg:col-span-8 bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center gap-4 flex-wrap">
              <h3 className="font-h3 text-base text-teal-900 flex items-center gap-2">
                <span className="material-symbols-outlined">priority_high</span>
                Urgent Tasks &amp; Escalations
              </h3>
              <span className="text-[10px] font-bold py-1 px-2 rounded-md bg-error text-white shrink-0">4 CRITICAL</span>
            </div>
            <div className="divide-y divide-slate-100">
              <TaskRow
                stripeClass="bg-error"
                title="Case #48102-Escalation"
                idTag="TX-902"
                desc="Eligibility verification required for emergency housing referral."
                meta={["2h remaining", "Admin A. Chen"]}
                action="REVIEW"
              />
              <TaskRow
                stripeClass="bg-amber-400"
                title="Inter-Agency Transfer #8821"
                idTag="IA-045"
                desc="Dept. of Health requesting medical history release for active case."
                meta={["4h remaining"]}
                action="APPROVE"
              />
              <TaskRow
                stripeClass="bg-amber-400"
                title="Compliance Audit Notification"
                idTag="AUD-77"
                desc="Quarterly system logs ready for review and digital signature."
                meta={["6h remaining"]}
                action="SIGN"
              />
            </div>
          </div>

          <div className="col-span-12 lg:col-span-4 bg-white rounded-lg border border-slate-200 p-6 flex flex-col h-full min-h-[320px]">
            <h3 className="font-label-caps text-xs tracking-widest text-slate-500 mb-6 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">dynamic_feed</span>
              INTER-AGENCY ACTIVITY
            </h3>
            <div className="space-y-6 relative before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-100">
              <ActivityItem icon="sync" border="border-teal-600" time="10:42 AM • DEPT_LABOR" text="Employment verification synced for Case #99281." />
              <ActivityItem icon="chat_bubble" border="border-slate-300" iconCls="text-slate-400" time="09:15 AM • HOUSING_AUTH" text='New comment: "Address confirmed via utility records."' />
              <ActivityItem icon="done_all" border="border-emerald-500" iconCls="text-emerald-500" time="08:02 AM • SYSTEM" text="Automated batch referral process completed successfully (42 items)." />
              <ActivityItem icon="outgoing_mail" border="border-teal-600" time="Yesterday • STATE_HEALTH" text="Transferred ownership of Case #44012 to Regional Office B." />
            </div>
            <button
              type="button"
              title="Demo only — not wired yet"
              className="mt-auto pt-6 text-center text-xs font-bold text-teal-700 hover:text-teal-900 border-t border-slate-100 mt-6 w-full bg-transparent cursor-default border-x-0 border-b-0"
            >
              VIEW FULL AUDIT LOG
            </button>
          </div>

          <div className="col-span-12 bg-white rounded-lg border border-slate-200 overflow-hidden">
            <div className="p-6">
              <h3 className="font-h3 text-lg text-teal-900 mb-1">Partner Agency Load</h3>
              <p className="text-sm text-slate-500 mb-6">Distribution of shared cases across inter-agency partners.</p>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-primary-container text-white">
                      <th className="px-4 py-3 font-label-caps text-[10px] tracking-wider rounded-tl-lg">AGENCY NAME</th>
                      <th className="px-4 py-3 font-label-caps text-[10px] tracking-wider">PRIMARY CONTACT</th>
                      <th className="px-4 py-3 font-label-caps text-[10px] tracking-wider text-center">SHARED CASES</th>
                      <th className="px-4 py-3 font-label-caps text-[10px] tracking-wider text-center">AVG RESPONSE</th>
                      <th className="px-4 py-3 font-label-caps text-[10px] tracking-wider text-right rounded-tr-lg">STATUS</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 text-sm font-bold text-teal-900">Health &amp; Human Services</td>
                      <td className="px-4 py-4 text-sm text-slate-600">Robert Miller</td>
                      <td className="px-4 py-4 text-sm font-system-id text-center">412</td>
                      <td className="px-4 py-4 text-sm text-center">1.2 days</td>
                      <td className="px-4 py-4 text-right">
                        <span className="inline-block px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          OPERATIONAL
                        </span>
                      </td>
                    </tr>
                    <tr className="bg-slate-50 hover:bg-slate-100 transition-colors">
                      <td className="px-4 py-4 text-sm font-bold text-teal-900">Child Welfare Div.</td>
                      <td className="px-4 py-4 text-sm text-slate-600">Elena Garcia</td>
                      <td className="px-4 py-4 text-sm font-system-id text-center">189</td>
                      <td className="px-4 py-4 text-sm text-center">2.4 days</td>
                      <td className="px-4 py-4 text-right">
                        <span className="inline-block px-2 py-1 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold">
                          OPERATIONAL
                        </span>
                      </td>
                    </tr>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-4 text-sm font-bold text-teal-900">Public Housing Authority</td>
                      <td className="px-4 py-4 text-sm text-slate-600">Marcus Wright</td>
                      <td className="px-4 py-4 text-sm font-system-id text-center">94</td>
                      <td className="px-4 py-4 text-sm text-center">4.1 days</td>
                      <td className="px-4 py-4 text-right">
                        <span className="inline-block px-2 py-1 rounded bg-amber-50 text-amber-700 text-[10px] font-bold">
                          AT CAPACITY
                        </span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
  );
}

function TaskRow({
  stripeClass,
  title,
  idTag,
  desc,
  meta,
  action,
}: {
  stripeClass: string;
  title: string;
  idTag: string;
  desc: string;
  meta: string[];
  action: string;
}) {
  return (
    <div className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4">
      <div className={`w-2 h-12 ${stripeClass} rounded-full shrink-0`} />
      <div className="flex-1 min-w-0">
        <div className="flex justify-between gap-2 flex-wrap">
          <h4 className="text-sm font-bold text-on-surface">{title}</h4>
          <span className="font-system-id text-xs text-slate-400 shrink-0">ID: {idTag}</span>
        </div>
        <p className="text-xs text-slate-600 mt-0.5">{desc}</p>
        <div className="flex gap-4 mt-2 flex-wrap">
          {meta.map((m) => (
            <span key={m} className="flex items-center gap-1 text-[10px] font-medium text-slate-500">
              <span className="material-symbols-outlined text-xs">{m.includes("remaining") ? "schedule" : "person"}</span>
              {m}
            </span>
          ))}
        </div>
      </div>
      <button
        type="button"
        title="Demo only — not wired to case workflow"
        className="px-3 py-1.5 border border-slate-200 rounded text-[10px] font-bold text-primary hover:bg-slate-100 shrink-0"
      >
        {action}
      </button>
    </div>
  );
}

function ActivityItem({
  icon,
  border,
  iconCls = "text-teal-600",
  time,
  text,
}: {
  icon: string;
  border: string;
  iconCls?: string;
  time: string;
  text: string;
}) {
  return (
    <div className="relative pl-8">
      <div
        className={`absolute left-0 top-0.5 w-6 h-6 rounded-full bg-white border-2 ${border} flex items-center justify-center z-10`}
      >
        <span className={`material-symbols-outlined text-[12px] ${iconCls}`}>{icon}</span>
      </div>
      <p className="text-[10px] font-system-id text-slate-400">{time}</p>
      <p className="text-sm font-semibold text-teal-900 mt-1 leading-snug">{text}</p>
    </div>
  );
}
