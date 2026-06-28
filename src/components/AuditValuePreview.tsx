import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import {
  buildAuditChangeRows,
  buildAuditDetailRows,
  hasAuditPayload,
  type AuditChangeRow,
} from "@/lib/auditDisplay";
import { formatAuditJson } from "@/lib/auditApi";

type Props = {
  oldValues?: unknown;
  newValues?: unknown;
  metadata?: unknown;
};

function EmptyNote({ children }: { children: string }) {
  return <p className="text-sm text-slate-500 italic">{children}</p>;
}

function ChangesTable({ rows }: { rows: AuditChangeRow[] }) {
  const { t } = useTranslation();
  const hasPrevious = rows.some((r) => r.previous !== "—");
  const hasNext = rows.some((r) => r.next !== "—");
  const showBoth = hasPrevious && hasNext;

  if (!showBoth && hasNext) {
    return <DetailGrid rows={rows.map((r) => ({ label: r.label, value: r.next }))} />;
  }

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200">
      <table className="w-full text-sm">
        <thead>
          <tr className="bg-slate-50 text-left">
            <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
              Field
            </th>
            {hasPrevious && (
              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Previous
              </th>
            )}
            {hasNext && (
              <th className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                {hasPrevious ? t("modals.audit.newValue") : t("modals.audit.value")}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row) => (
            <tr key={row.field} className={row.changed ? "bg-amber-50/40" : "bg-white"}>
              <td className="px-3 py-2 font-medium text-slate-700 align-top whitespace-nowrap">
                {row.label}
              </td>
              {hasPrevious && (
                <td className="px-3 py-2 text-slate-600 align-top break-words max-w-[200px]">
                  <ValueCell text={row.previous} muted={row.previous === "—"} />
                </td>
              )}
              {hasNext && (
                <td className="px-3 py-2 text-slate-800 align-top break-words max-w-[200px]">
                  <ValueCell text={row.next} highlight={row.changed} />
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DetailGrid({ rows }: { rows: { label: string; value: string }[] }) {
  return (
    <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-slate-200 bg-slate-50/50 p-3">
      {rows.map((row) => (
        <div key={row.label} className="min-w-0">
          <dt className="text-[10px] font-label-caps text-slate-500 uppercase tracking-wide mb-0.5">
            {row.label}
          </dt>
          <dd className="text-sm text-slate-800 break-words">
            <ValueCell text={row.value} />
          </dd>
        </div>
      ))}
    </dl>
  );
}

function ValueCell({ text, muted, highlight }: { text: string; muted?: boolean; highlight?: boolean }) {
  const className = [
    "break-words",
    muted ? "text-slate-400" : "",
    highlight ? "font-medium text-teal-900" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (text.length > 80 || text.includes("@") || /^[0-9a-f-]{36}$/i.test(text)) {
    return <span className={`font-mono text-xs ${className}`}>{text}</span>;
  }
  return <span className={className}>{text}</span>;
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: string;
  children: ReactNode;
}) {
  return (
    <section>
      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2 flex items-center gap-1.5">
        <span className="material-symbols-outlined text-[16px] text-primary">{icon}</span>
        {title}
      </h3>
      {children}
    </section>
  );
}

function RawJsonToggle({ label, value }: { label: string; value: unknown }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  if (!hasAuditPayload(value) && value == null) return null;

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="text-xs font-semibold text-slate-500 hover:text-primary inline-flex items-center gap-1"
      >
        <span className="material-symbols-outlined text-[14px]">
          {open ? "expand_less" : "expand_more"}
        </span>
        {open ? t("modals.audit.hideRaw", { label }) : t("modals.audit.showRaw", { label })}
      </button>
      {open && (
        <pre className="mt-2 text-xs bg-slate-900 text-slate-100 rounded-lg p-3 overflow-x-auto max-h-48 font-mono">
          {formatAuditJson(value)}
        </pre>
      )}
    </div>
  );
}

export default function AuditValuePreview({ oldValues, newValues, metadata }: Props) {
  const { t } = useTranslation();
  const changes = buildAuditChangeRows(oldValues, newValues);
  const metaRows = buildAuditDetailRows(metadata);
  const hasChanges = changes.length > 0;
  const hasMeta = metaRows.length > 0;

  if (!hasChanges && !hasMeta) {
    return <EmptyNote>No additional details were recorded for this entry.</EmptyNote>;
  }

  return (
    <div className="space-y-5">
      {hasChanges && (
        <Section title={t("modals.audit.changes")} icon="difference">
          <ChangesTable rows={changes} />
          <RawJsonToggle label="change data" value={{ oldValues, newValues }} />
        </Section>
      )}

      {hasMeta && (
        <Section title={t("modals.audit.additionalContext")} icon="info">
          <DetailGrid rows={metaRows} />
          <RawJsonToggle label="metadata" value={metadata} />
        </Section>
      )}
    </div>
  );
}
