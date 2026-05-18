import { Link } from "react-router-dom";

type Props = {
  /** Short, human-readable name of the resource the user tried to read. */
  resource?: string;
  /** Optional secondary message from the server. */
  detail?: string;
  /** Override the back-link target. Defaults to /dashboard. */
  backTo?: string;
  /** Label for the back-link button. */
  backLabel?: string;
};

/**
 * Standardized 403 empty state for pages that load a resource and get
 * permission-denied back. Decoupled from any one feature so every page
 * renders the same "access restricted" experience.
 */
export default function ForbiddenView({
  resource = "this resource",
  detail,
  backTo = "/dashboard",
  backLabel = "Back to dashboard",
}: Props) {
  return (
    <div className="p-gutter max-w-2xl mx-auto w-full text-center pb-10">
      <div className="bg-white border border-outline-variant rounded-xl p-xl shadow-sm">
        <span className="material-symbols-outlined text-5xl text-slate-300 inline-block" aria-hidden>
          lock
        </span>
        <h1 className="font-h2 text-primary mt-2 mb-2">Access restricted</h1>
        <p className="font-body-md text-slate-600 mb-2">
          Your role doesn&apos;t have permission to view {resource}.
        </p>
        {detail ? (
          <p className="text-sm text-slate-500 italic mb-2">{detail}</p>
        ) : null}
        <p className="text-sm text-slate-500 mb-6">
          If you believe this is a mistake, contact your agency administrator.
        </p>
        <Link
          to={backTo}
          className="inline-flex items-center gap-2 bg-primary text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-primary-container transition-colors"
        >
          <span className="material-symbols-outlined text-sm">arrow_back</span>
          {backLabel}
        </Link>
      </div>
    </div>
  );
}
