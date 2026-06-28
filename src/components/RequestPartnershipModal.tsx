import { FormEvent, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import type { ApiCase } from "@/lib/casesApi";

type Props = {
  open: boolean;
  onClose: () => void;
  fromTenantId: string;
  userId: string;
};

type CasesResponse = { cases?: ApiCase[] };

export default function RequestPartnershipModal({ open, onClose, fromTenantId, userId }: Props) {
  const { t } = useTranslation();
  const [caseId, setCaseId] = useState("");
  const [partnerCode, setPartnerCode] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [cases, setCases] = useState<ApiCase[]>([]);
  const [casesLoading, setCasesLoading] = useState(false);

  useEffect(() => {
    if (!open || !fromTenantId) return;
    let cancelled = false;
    (async () => {
      setCasesLoading(true);
      try {
        const q = new URLSearchParams({ tenantId: fromTenantId });
        const data = (await apiGet(`/api/v1/cases?${q.toString()}`)) as CasesResponse;
        if (!cancelled) setCases(Array.isArray(data.cases) ? data.cases : []);
      } catch {
        if (!cancelled) setCases([]);
      } finally {
        if (!cancelled) setCasesLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, fromTenantId]);

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const cid = caseId.trim();
    const code = partnerCode.trim().toUpperCase();
    if (!cid || !code) {
      setMsg(t("modals.referral.selectCaseAndPartner"));
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
        setMsg(t("modals.referral.unknownTenant"));
        setSubmitting(false);
        return;
      }
      if (toTenantId === fromTenantId) {
        setMsg(t("modals.referral.partnerMustDiffer"));
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
      setMsg(t("modals.referral.createdOpenCase"));
    } catch (err) {
      setMsg(err instanceof ApiError ? err.message : t("modals.referral.createFailed"));
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
            {t("modals.referral.title")}
          </h2>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100" aria-label={t("common.close")}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <p className="text-xs text-slate-600">
            Refer one of your cases to another agency. Choose a case below, or paste its UUID from the case page URL.
          </p>
          {msg && (
            <p className={`text-sm ${msg.includes("created") ? "text-teal-800" : "text-red-700"}`}>{msg}</p>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="rp-case">
              {t("modals.referral.caseLabel")}
            </label>
            {casesLoading ? (
              <p className="text-sm text-slate-500">{t("cases.loading")}</p>
            ) : cases.length > 0 ? (
              <select
                id="rp-case"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={caseId}
                onChange={(e) => setCaseId(e.target.value)}
              >
                <option value="">Select a case…</option>
                {cases.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.caseNumber ?? c.id.slice(0, 8)} — {c.title}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
                No cases loaded. Paste the case UUID from the address bar when viewing a case.
              </p>
            )}
            <input
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono mt-2"
              value={caseId}
              onChange={(e) => setCaseId(e.target.value)}
              placeholder={t("modals.referral.caseUuidPlaceholder")}
              aria-label={t("modals.referral.caseUuidAria")}
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="rp-code">
              {t("modals.referral.partnerCode")}
            </label>
            <input
              id="rp-code"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono uppercase"
              value={partnerCode}
              onChange={(e) => setPartnerCode(e.target.value)}
              placeholder="e.g. CPS-GCPD"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="rp-notes">
              {t("common.description")} ({t("common.optional")})
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
              {t("common.close")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-sm font-semibold bg-primary-container text-white rounded-lg disabled:opacity-50"
            >
              {submitting ? t("modals.referral.submitting") : t("modals.referral.submit")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
