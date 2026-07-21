import type { FileStatus } from "@/lib/filesApi";

const STYLES: Record<FileStatus, string> = {
  PENDING: "bg-slate-100 text-slate-700 border-slate-200",
  SCANNING: "bg-amber-50 text-amber-900 border-amber-200",
  PROCESSING: "bg-sky-50 text-sky-900 border-sky-200",
  AVAILABLE: "bg-teal-50 text-teal-900 border-teal-200",
  FAILED: "bg-red-50 text-red-800 border-red-200",
  DELETED: "bg-slate-100 text-slate-500 border-slate-200",
};

const LABELS: Record<FileStatus, string> = {
  PENDING: "Pending",
  SCANNING: "Scanning",
  PROCESSING: "Processing",
  AVAILABLE: "Ready",
  FAILED: "Failed",
  DELETED: "Deleted",
};

type Props = {
  status: FileStatus | string;
  className?: string;
};

export default function FileStatusBadge({ status, className = "" }: Props) {
  const key = (status in STYLES ? status : "PENDING") as FileStatus;
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${STYLES[key]} ${className}`}
    >
      {LABELS[key] ?? status}
    </span>
  );
}
