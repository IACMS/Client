import { FormEvent, useEffect, useState } from "react";
import { ApiError, apiGet, apiPost } from "@/lib/api";

type TenantMini = { id?: string; name?: string; code?: string };

export type ApiReferral = {
  id: string;
  caseId: string;
  status: string;
  referralReason?: string | null;
  notes?: string | null;
  fromTenant?: TenantMini;
  toTenant?: TenantMini;
  referredAt?: string;
};

function ReferralsList({ caseId, version }: { caseId: string; version: number }) {
  const [rows, setRows] = useState<ApiReferral[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const q = new URLSearchParams({ caseId });
        const data = (await apiGet(`/api/v1/referrals?${q}`)) as { referrals?: ApiReferral[] };
        if (!cancelled) setRows(Array.isArray(data.referrals) ? data.referrals : []);
      } catch (e) {
        if (!cancelled)
          setErr(e instanceof ApiError ? e.message : "Could not load referrals.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [caseId, version]);

  if (loading) {
    return (
      <p className="text-sm text-slate-500 flex items-center gap-2">
        <span className="material-symbols-outlined text-lg animate-pulse">progress_activity</span>
        Loading referrals…
      </p>
    );
  }
  if (err) {
    return <p className="text-sm text-red-700">{err}</p>;
  }
  if (rows.length === 0) {
    return <p className="text-sm text-slate-600">No referrals for this case yet.</p>;
  }
  return (
    <ul className="divide-y divide-slate-200 border border-slate-200 rounded-lg overflow-hidden bg-white">
      {rows.map((r) => (
        <li key={r.id} className="p-4 text-sm">
          <div className="flex flex-wrap justify-between gap-2">
            <span className="font-semibold text-slate-800">
              {r.fromTenant?.code ?? "—"} → {r.toTenant?.code ?? "—"}
            </span>
            <span className="text-xs uppercase font-bold text-teal-700">{r.status}</span>
          </div>
          {r.referralReason && <p className="text-slate-600 mt-2">{r.referralReason}</p>}
          <p className="text-xs text-slate-400 mt-1 font-mono">{r.id}</p>
        </li>
      ))}
    </ul>
  );
}

export default function CaseReferralsPanel({
  caseId,
  fromTenantId,
  userId,
}: {
  caseId: string;
  fromTenantId: string;
  userId: string;
}) {
  const [partnerCode, setPartnerCode] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [listVersion, setListVersion] = useState(0);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const code = partnerCode.trim().toUpperCase();
    if (!code) {
      setMsg("Partner tenant code is required.");
      return;
    }
    setMsg(null);
    setSubmitting(true);
    try {
      const v = (await apiGet(`/api/v1/tenants/validate/${encodeURIComponent(code)}`)) as {
        valid?: boolean;
        tenant?: { id: string };
      };
      const toTenantId = v.tenant?.id;
      if (!v.valid || !toTenantId) {
        setMsg("Unknown or inactive tenant code.");
        setSubmitting(false);
        return;
      }
      if (toTenantId === fromTenantId) {
        setMsg("Partner tenant must differ from your own.");
        setSubmitting(false);
        return;
      }
      await apiPost("/api/v1/referrals", {
        caseId,
        fromTenantId,
        toTenantId,
        referredBy: userId,
        ...(reason.trim() ? { referralReason: reason.trim() } : {}),
      });
      setPartnerCode("");
      setReason("");
      setListVersion((x) => x + 1);
      setMsg("Referral created.");
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "Could not create referral.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="p-lg space-y-lg max-w-3xl">
      <div>
        <h3 className="font-h3 text-primary mb-2">Refer this case to a partner tenant</h3>
        <p className="text-sm text-slate-600">
          Enter the partner organization&apos;s tenant code. They receive a record via the referral service (and email when
          notifications are configured).
        </p>
      </div>
      <form onSubmit={handleSubmit} className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
        {msg && (
          <p
            className={`text-sm ${msg.includes("created") && !msg.includes("not") ? "text-teal-800" : "text-red-700"}`}
          >
            {msg}
          </p>
        )}
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="ref-code">
            Partner tenant code
          </label>
          <input
            id="ref-code"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono uppercase"
            value={partnerCode}
            onChange={(e) => setPartnerCode(e.target.value)}
            placeholder="e.g. PARTNER-ORG"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="ref-reason">
            Reason (optional)
          </label>
          <textarea
            id="ref-reason"
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[72px]"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="bg-primary-container text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Create referral"}
        </button>
      </form>
      <div>
        <h4 className="font-label-caps text-slate-500 mb-2">Existing referrals</h4>
        <ReferralsList caseId={caseId} version={listVersion} />
      </div>
    </div>
  );
}
