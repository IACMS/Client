import { useTranslation } from "react-i18next";

type Props = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "danger" | "primary";
  busy?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = "primary",
  busy = false,
  onConfirm,
  onCancel,
}: Props) {
  const { t } = useTranslation();
  const resolvedConfirm = confirmLabel ?? t("common.confirm");
  const resolvedCancel = cancelLabel ?? t("common.cancel");
  if (!open) return null;

  const confirmClass =
    variant === "danger"
      ? "bg-red-600 text-white hover:bg-red-700"
      : "bg-primary text-white hover:bg-primary-container";

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/40"
      role="presentation"
      onClick={onCancel}
    >
      <div
        role="alertdialog"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-desc"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-lg max-w-sm w-full border border-slate-200 p-4"
      >
        <h2 id="confirm-title" className="font-h3 text-slate-900">
          {title}
        </h2>
        <p id="confirm-desc" className="text-sm text-slate-600 mt-2 whitespace-pre-line">
          {message}
        </p>
        <div className="flex gap-2 mt-4 justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 rounded-lg border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            {resolvedCancel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className={`px-4 py-2 rounded-lg font-semibold disabled:opacity-50 ${confirmClass}`}
          >
            {busy ? t("common.pleaseWait") : resolvedConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
