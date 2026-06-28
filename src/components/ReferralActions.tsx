import { useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, apiPost } from "@/lib/api";
import ConfirmDialog from "@/components/ConfirmDialog";
import { type ApiReferral, referralDirection } from "@/lib/referralsApi";
import { usePermissions } from "@/permissions/usePermissions";

type Props = {
  referral: ApiReferral;
  actorTenantId: string;
  userId: string;
  onUpdated: () => void;
  layout?: "row" | "stack";
};

type PendingAction = "accept" | "reject" | "complete" | null;

export default function ReferralActions({
  referral,
  actorTenantId,
  userId,
  onUpdated,
  layout = "row",
}: Props) {
  const { t } = useTranslation();
  const { can } = usePermissions();
  const canUpdate = can("referrals:update");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState<PendingAction>(null);

  const direction = referralDirection(referral, actorTenantId);
  const status = referral.status.toLowerCase();

  async function runAction(action: PendingAction) {
    if (!action) return;
    setBusy(true);
    setError(null);
    try {
      const path = `/api/v1/referrals/${encodeURIComponent(referral.id)}/${action}`;
      const body =
        action === "accept"
          ? { acceptedBy: userId }
          : action === "reject"
            ? { rejectedBy: userId }
            : { completedBy: userId };
      await apiPost(path, body);
      setPending(null);
      onUpdated();
    } catch (e) {
      setError(e instanceof ApiError ? e.message : `Could not ${action} referral.`);
      setPending(null);
    } finally {
      setBusy(false);
    }
  }

  if (!canUpdate) return null;

  const showAccept = status === "pending" && direction === "incoming";
  const showReject = status === "pending" && (direction === "incoming" || direction === "outgoing");
  const showComplete = status === "accepted" && direction !== "other";

  if (!showAccept && !showReject && !showComplete) return null;

  const btn =
    "text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors disabled:opacity-50";
  const wrap = layout === "stack" ? "flex flex-col gap-2 items-stretch" : "flex flex-wrap gap-2 justify-end";

  return (
    <>
      <ConfirmDialog
        open={pending === "accept"}
        title={t("modals.referral.acceptTitle")}
        message={t("modals.referral.acceptMessage")}
        confirmLabel={t("modals.referral.accept")}
        busy={busy}
        onCancel={() => !busy && setPending(null)}
        onConfirm={() => void runAction("accept")}
      />
      <ConfirmDialog
        open={pending === "reject"}
        title={t("modals.referral.rejectTitle")}
        message={t("modals.referral.rejectMessage")}
        confirmLabel={t("modals.referral.reject")}
        variant="danger"
        busy={busy}
        onCancel={() => !busy && setPending(null)}
        onConfirm={() => void runAction("reject")}
      />
      <ConfirmDialog
        open={pending === "complete"}
        title={t("modals.referral.completeTitle")}
        message={t("modals.referral.completeMessage")}
        confirmLabel={t("modals.referral.complete")}
        busy={busy}
        onCancel={() => !busy && setPending(null)}
        onConfirm={() => void runAction("complete")}
      />

      <div className={wrap}>
        {error && <p className="text-xs text-red-700 w-full text-right">{error}</p>}
        {showAccept && (
          <button
            type="button"
            disabled={busy}
            className={`${btn} bg-teal-700 text-white border-teal-800 hover:bg-teal-800`}
            onClick={() => setPending("accept")}
          >
            {t("modals.referral.accept")}
          </button>
        )}
        {showReject && (
          <button
            type="button"
            disabled={busy}
            className={`${btn} bg-white text-red-700 border-red-200 hover:bg-red-50`}
            onClick={() => setPending("reject")}
          >
            {t("modals.referral.reject")}
          </button>
        )}
        {showComplete && (
          <button
            type="button"
            disabled={busy}
            className={`${btn} bg-primary text-white border-primary hover:bg-primary-container`}
            onClick={() => setPending("complete")}
          >
            {t("modals.referral.complete")}
          </button>
        )}
      </div>
    </>
  );
}
