import { FormEvent, useEffect, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  actionName: string;
  targetStepName?: string;
  requiresComment: boolean;
  submitting: boolean;
  error: string | null;
  onExecute: (comment: string | undefined) => void;
};

export default function ExecuteTransitionModal({
  open,
  onClose,
  actionName,
  targetStepName,
  requiresComment,
  submitting,
  error,
  onExecute,
}: Props) {
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (open) setComment("");
  }, [open, actionName]);

  if (!open) return null;

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const c = comment.trim();
    if (requiresComment && !c) return;
    onExecute(c || undefined);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
      role="presentation"
      onClick={() => !submitting && onClose()}
    >
      <div
        role="dialog"
        aria-labelledby="exec-tr-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-lg max-w-md w-full border border-slate-200"
      >
        <div className="p-4 border-b border-slate-100 flex justify-between items-center">
          <h2 id="exec-tr-title" className="font-h3 text-primary">
            Run transition
          </h2>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="p-1 rounded hover:bg-slate-100"
            aria-label="Close"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <p className="text-sm text-slate-700">
            <span className="font-semibold">{actionName}</span>
            {targetStepName ? (
              <>
                {" "}
                → <span className="font-semibold text-teal-800">{targetStepName}</span>
              </>
            ) : null}
          </p>
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="exec-comment">
              Comment {requiresComment ? <span className="text-red-600">*</span> : <span className="font-normal">(optional)</span>}
            </label>
            <textarea
              id="exec-comment"
              rows={3}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder={requiresComment ? "Required for this transition…" : "Add context for the audit log…"}
            />
          </div>
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || (requiresComment && !comment.trim())}
              className="flex-1 bg-primary text-white py-2.5 rounded-lg font-semibold hover:bg-primary-container disabled:opacity-50"
            >
              {submitting ? "Executing…" : "Execute"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
