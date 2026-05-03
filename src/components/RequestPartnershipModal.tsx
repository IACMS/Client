import { FormEvent, useState } from "react";
import { ApiError, apiGet, apiPost } from "@/lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  fromTenantId: string;
  userId: string;
};

export default function RequestPartnershipModal({ open, onClose, fromTenantId, userId }: Props) {
  const [caseId, setCaseId] = useState("");
  const [partnerCode, setPartnerCode] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cid = caseId.trim();
    const code = partnerCode.trim().toUpperCase();
    if (!cid || !code) {
      setMsg("Case ID and partner tenant code are required.");
      return;
    }
    setMsg(null);
    setSubmitting(true);
    try {
      const v = (await apiGet(`/api/v1/tenants/validate/${encodeURIComponent(code)}`)) as {
        valid?: boolean;
        tenant?: { id: string; name?: string };
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
        caseId: cid,
        fromTenantId,
        toTenantId,
        referredBy: userId,
        ...(notes.trim() ? { referralReason: notes.trim() } : {}),
      });
      setCaseId("");
      setPartnerCode("");
      setNotes("");
      setMsg("Referral created. Open the case to see details in the Referrals tab.");
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : "Could not create referral.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="partnership-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-lg max-w-md w-full border border-slate-200"
      >
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 id="partnership-title" className="font-h3 text-primary">
            Request partnership (referral)
          </h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100" aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <p className="text-xs text-slate-600">
            Refer an existing case to another agency by case UUID (from the case URL or metadata) and the partner&apos;s
            tenant code.
          </p>
          {msg && (
            <p className={`text-sm ${msg.includes("created") ? "text-teal-800" : "text-red-700"}`}>{msg}</p>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="rp-case">
              Case ID (UUID)
            </label>
            <input
              id="rp-case"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="rp-code">
              Partner tenant code
            </label>
            <input
              id="rp-code"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono uppercase"
              value={partnerCode}
              onChange={(e) => setPartnerCode(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="rp-notes">
              Notes (optional)
            </label>
            <textarea
              id="rp-notes"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm min-h-[64px]"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold bg-primary-container text-white rounded-lg disabled:opacity-50"
            >
              {submitting ? "Submitting…" : "Submit referral"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
