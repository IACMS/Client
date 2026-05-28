import { FormEvent, useState } from "react";
import { StubNavItem } from "@/components/StubNavItem";
import { ApiError, apiPost } from "@/lib/api";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Called after a successful registration (tokens from the API are not applied to the current session). */
  onCreated?: (summary: { code: string; name: string; registrarEmail: string }) => void;
};

type RegisterResponse = {
  message?: string;
  tenant?: { id: string; name: string; code: string };
  user?: { id: string; email: string; firstName?: string; lastName?: string };
};

export default function CreateAgencyModal({ open, onClose, onCreated }: Props) {
  const [agreed, setAgreed] = useState(false);
  const [tenantName, setTenantName] = useState("");
  const [tenantCode, setTenantCode] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [success, setSuccess] = useState<RegisterResponse | null>(null);

  function resetAndClose() {
    setAgreed(false);
    setTenantName("");
    setTenantCode("");
    setFirstName("");
    setLastName("");
    setUsername("");
    setEmail("");
    setErrorMessage(null);
    setSuccess(null);
    onClose();
  }

  if (!open) return null;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!agreed) return;
    const em = email.trim().toLowerCase();
    const tc = tenantCode.trim().toUpperCase();
    const tn = tenantName.trim();
    const fn = firstName.trim();
    const ln = lastName.trim();
    const un = username.trim().toLowerCase();
    if (!tn || !tc || !fn || !ln || !em) {
      setErrorMessage("Fill in all required fields.");
      return;
    }
    setErrorMessage(null);
    setSubmitting(true);
    try {
      const body: Record<string, string> = {
        tenantName: tn,
        tenantCode: tc,
        firstName: fn,
        lastName: ln,
        email: em,
      };
      if (un.length >= 3) body.username = un;

      const reg = (await apiPost("/api/v1/tenants/register", body)) as RegisterResponse;
      setSuccess(reg);
      const t = reg.tenant;
      const u = reg.user;
      if (t?.code && t.name && u?.email) {
        onCreated?.({ code: t.code, name: t.name, registrarEmail: u.email });
      }
    } catch (err) {
      const message =
        err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Registration failed.";
      setErrorMessage(
        message.includes("fetch") || message === "Failed to fetch"
          ? "Cannot reach the API gateway. Check VITE_API_URL and that the backend is running."
          : message,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40"
      role="presentation"
      onClick={resetAndClose}
    >
      <div
        role="dialog"
        aria-labelledby="create-agency-title"
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-xl shadow-lg max-w-lg w-full max-h-[min(90dvh,720px)] border border-slate-200 flex flex-col"
      >
        <div className="p-4 border-b border-slate-100 flex justify-between items-center shrink-0">
          <h2 id="create-agency-title" className="font-h3 text-primary flex items-center gap-2">
            <span className="material-symbols-outlined" aria-hidden>
              add_business
            </span>
            Register new agency
          </h2>
          <button type="button" onClick={resetAndClose} className="p-1 rounded hover:bg-slate-100" aria-label="Close">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        {success?.tenant ? (
          <div className="p-4 overflow-y-auto">
            <div className="p-md bg-teal-50 border border-teal-200 rounded-lg text-teal-900 text-sm space-y-2">
              <p className="font-semibold">Agency created</p>
              <p>
                <span className="font-medium">Organization:</span> {success.tenant.name}
              </p>
              <p>
                <span className="font-medium">Tenant code:</span>{" "}
                <span className="font-mono">{success.tenant.code}</span>
              </p>
              <p>
                <span className="font-medium">First administrator:</span> {success.user?.email ?? "—"}
              </p>
              <p className="text-xs text-teal-800 pt-2 border-t border-teal-200">
                A temporary password was generated and emailed to the administrator. Share the tenant code with them so
                they can sign in and set a new password. Your current session is unchanged.
              </p>
            </div>
            <button
              type="button"
              className="mt-4 w-full bg-primary text-white py-2.5 rounded-lg font-semibold hover:bg-primary-container transition-colors"
              onClick={resetAndClose}
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-4 overflow-y-auto flex flex-col gap-3 min-h-0">
            <p className="text-xs text-slate-600">
              Provisions a new tenant and its first tenant administrator. A temporary password is generated server-side
              and sent to the administrator&apos;s email — you do not set a password here.
            </p>
            {errorMessage && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">{errorMessage}</div>
            )}
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="ca-org">
                Organization name
              </label>
              <input
                id="ca-org"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={tenantName}
                onChange={(ev) => setTenantName(ev.target.value)}
                autoComplete="organization"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="ca-code">
                Tenant code
              </label>
              <input
                id="ca-code"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono uppercase"
                placeholder="e.g. MY-AGENCY-01"
                value={tenantCode}
                onChange={(ev) => setTenantCode(ev.target.value)}
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">Stored uppercase; must be unique.</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="ca-fn">
                  First name
                </label>
                <input
                  id="ca-fn"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={firstName}
                  onChange={(ev) => setFirstName(ev.target.value)}
                  autoComplete="given-name"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="ca-ln">
                  Last name
                </label>
                <input
                  id="ca-ln"
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                  value={lastName}
                  onChange={(ev) => setLastName(ev.target.value)}
                  autoComplete="family-name"
                  required
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="ca-un">
                Username (optional)
              </label>
              <input
                id="ca-un"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm font-mono"
                placeholder="Defaults from email"
                value={username}
                onChange={(ev) => setUsername(ev.target.value)}
                autoComplete="username"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1" htmlFor="ca-em">
                Administrator email
              </label>
              <input
                id="ca-em"
                type="email"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                autoComplete="email"
                required
              />
              <p className="text-[11px] text-slate-500 mt-1">Welcome email with a temporary password is sent here.</p>
            </div>
            <label className="flex items-start gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200 cursor-pointer text-xs text-slate-600">
              <input
                className="h-4 w-4 rounded text-primary shrink-0 mt-0.5"
                type="checkbox"
                checked={agreed}
                onChange={(ev) => setAgreed(ev.target.checked)}
              />
              <span>
                I agree to the{" "}
                <StubNavItem className="inline text-primary font-bold underline underline-offset-2">
                  Inter-Agency Data Sharing Agreement
                </StubNavItem>
                .
              </span>
            </label>
            <div className="flex gap-2 pt-2 border-t border-slate-100 sticky bottom-0 bg-white pb-1">
              <button
                type="button"
                onClick={resetAndClose}
                className="flex-1 py-2.5 rounded-lg border border-slate-200 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!agreed || submitting}
                className="flex-1 bg-primary text-white py-2.5 rounded-lg font-semibold hover:bg-primary-container disabled:opacity-50 disabled:pointer-events-none"
              >
                {submitting ? "Creating…" : "Create agency"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
