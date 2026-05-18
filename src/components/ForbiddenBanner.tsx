import { useEffect } from "react";
import { useSession } from "@/context/SessionContext";

/**
 * Renders a transient banner whenever the API client emits a 403 via `authBus`.
 * Auto-dismisses after a short delay; can also be dismissed manually.
 */
export default function ForbiddenBanner() {
  const { forbiddenMessage, clearForbiddenMessage } = useSession();

  useEffect(() => {
    if (!forbiddenMessage) return;
    const t = window.setTimeout(clearForbiddenMessage, 6000);
    return () => window.clearTimeout(t);
  }, [forbiddenMessage, clearForbiddenMessage]);

  if (!forbiddenMessage) return null;
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="fixed top-20 right-4 z-[200] max-w-sm rounded-xl border border-amber-200 bg-amber-50 text-amber-900 shadow-lg px-4 py-3 flex items-start gap-2"
    >
      <span className="material-symbols-outlined text-amber-700 shrink-0" aria-hidden>
        block
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">Permission denied</p>
        <p className="text-xs mt-0.5">{forbiddenMessage}</p>
      </div>
      <button
        type="button"
        onClick={clearForbiddenMessage}
        className="text-amber-900 hover:bg-amber-100 rounded p-1 shrink-0"
        aria-label="Dismiss"
      >
        <span className="material-symbols-outlined text-[18px]">close</span>
      </button>
    </div>
  );
}
