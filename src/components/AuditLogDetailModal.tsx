import { useEffect, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, apiGet, isAbortError } from "@/lib/api";
import AuditValuePreview from "@/components/AuditValuePreview";
import {
  type AuditLogRow,
  auditActorLabel,
  formatAuditWhen,
} from "@/lib/auditApi";
import { formatAuditAction, formatEntityType } from "@/lib/auditDisplay";

type Props = {
  logId: string | null;
  preview?: AuditLogRow | null;
  onClose: () => void;
};

function DetailBlock({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] font-label-caps text-slate-500 uppercase tracking-wide mb-1">{label}</p>
      <div className="text-sm text-slate-800">{children}</div>
    </div>
  );
}

export default function AuditLogDetailModal({ logId, preview, onClose }: Props) {
  const { t } = useTranslation();
  const [log, setLog] = useState<AuditLogRow | null>(preview ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!logId) {
      setLog(null);
      return;
    }
    setLog(preview ?? null);
    const ac = new AbortController();
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = (await apiGet(`/api/v1/audit/${encodeURIComponent(logId)}`, {
          signal: ac.signal,
        })) as { log?: AuditLogRow };
        if (!ac.signal.aborted) setLog(data.log ?? preview ?? null);
      } catch (e) {
        if (isAbortError(e) || ac.signal.aborted) return;
        setError(e instanceof ApiError ? e.message : t("modals.audit.loadFailed"));
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();
    return () => ac.abort();
  }, [logId, preview]);

  if (!logId) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-labelledby="audit-detail-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-lg max-w-3xl w-full max-h-[90vh] overflow-hidden border border-slate-200 flex flex-col"
      >
        <div className="p-4 border-b border-slate-100 flex justify-between items-start gap-4 shrink-0">
          <div>
            <h2 id="audit-detail-title" className="font-h3 text-primary">
              {t("modals.audit.detailTitle")}
            </h2>
            {log && (
              <>
                <p className="text-sm font-semibold text-slate-800 mt-1">
                  {formatAuditAction(log.action)}
                </p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">{log.action}</p>
              </>
            )}
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded hover:bg-slate-100 shrink-0" aria-label={t("common.close")}>
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-4 overflow-y-auto flex-1 space-y-5">
          {loading && (
            <p className="text-sm text-slate-500 flex items-center gap-2">
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              {t("common.loading")}
            </p>
          )}
          {error && <p className="text-sm text-red-700">{error}</p>}
          {log && !loading && (
            <>
              <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-4">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-primary">summarize</span>
                  Summary
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <DetailBlock label={t("modals.audit.when")}>{formatAuditWhen(log.createdAt)}</DetailBlock>
                  <DetailBlock label={t("modals.audit.actor")}>{auditActorLabel(log)}</DetailBlock>
                  <DetailBlock label={t("modals.audit.tenant")}>{log.tenant?.name ?? log.tenant?.code ?? log.tenantId ?? "—"}</DetailBlock>
                  <DetailBlock label={t("modals.audit.relatedTenant")}>
                    {log.relatedTenant?.name ?? log.relatedTenant?.code ?? log.relatedTenantId ?? "—"}
                  </DetailBlock>
                  <DetailBlock label={t("modals.audit.entityType")}>{formatEntityType(log.entityType)}</DetailBlock>
                  <DetailBlock label={t("modals.audit.entityId")}>
                    {log.entityId ? (
                      <span className="font-mono text-xs break-all">{log.entityId}</span>
                    ) : (
                      "—"
                    )}
                  </DetailBlock>
                  <DetailBlock label={t("modals.audit.entryId")}>
                    <span className="font-mono text-xs break-all">{log.id}</span>
                  </DetailBlock>
                </div>
              </div>

              {(log.ipAddress || log.userAgent) && (
                <div className="rounded-lg border border-slate-200 p-4">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[16px] text-primary">devices</span>
                    Client
                  </h3>
                  <div className="grid grid-cols-1 gap-3">
                    {log.ipAddress && <DetailBlock label="IP address">{log.ipAddress}</DetailBlock>}
                    {log.userAgent && (
                      <DetailBlock label={t("modals.audit.userAgent")}>
                        <span className="text-xs break-all text-slate-600">{log.userAgent}</span>
                      </DetailBlock>
                    )}
                  </div>
                </div>
              )}

              <AuditValuePreview
                oldValues={log.oldValues}
                newValues={log.newValues}
                metadata={log.metadata}
              />
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-100 flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold border border-slate-200 rounded-lg hover:bg-slate-50"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}
