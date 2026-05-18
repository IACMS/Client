import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useSession } from "@/context/SessionContext";
import { ApiError, apiGet, apiPatch, apiPost } from "@/lib/api";
import { PASSWORD_HINT, isPasswordValid } from "@/lib/passwordRules";

type ProfileUser = {
  id: string;
  email: string;
  username?: string;
  firstName?: string | null;
  lastName?: string | null;
  phone?: string | null;
  isEmailVerified?: boolean;
  tenant?: { id?: string; name?: string; code?: string };
};

export default function SettingsPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user: sessionUser, refresh: refreshSession } = useSession();
  const mustChangeFirst = sessionUser?.mustChangePassword === true;

  const [loading, setLoading] = useState(!mustChangeFirst);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profile, setProfile] = useState<ProfileUser | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSaved, setProfileSaved] = useState<string | null>(null);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMessage, setPwdMessage] = useState<string | null>(null);

  useEffect(() => {
    if (mustChangeFirst) {
      setLoading(false);
      setProfile(null);
      setProfileError(null);
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      setProfileError(null);
      try {
        const data = (await apiGet("/api/v1/auth/profile")) as { user?: ProfileUser };
        if (cancelled || !data?.user) return;
        const u = data.user;
        setProfile(u);
        setFirstName(u.firstName ?? "");
        setLastName(u.lastName ?? "");
        setPhone(u.phone ?? "");
      } catch (err) {
        if (!cancelled) {
          setProfileError(err instanceof ApiError ? err.message : "Could not load profile.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [mustChangeFirst]);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setProfileSaved(null);
    setProfileSaving(true);
    try {
      const body: Record<string, string | null> = {};
      if ((firstName || "") !== (profile?.firstName ?? "")) body.firstName = firstName.trim();
      if ((lastName || "") !== (profile?.lastName ?? "")) body.lastName = lastName.trim();
      const pTrim = phone.trim();
      const prev = profile?.phone ?? "";
      if (pTrim !== prev) body.phone = pTrim || null;
      if (Object.keys(body).length === 0) {
        setProfileSaved("No changes to save.");
        return;
      }
      await apiPatch("/api/v1/auth/profile", body);
      await refreshSession();
      setProfileSaved("Profile updated.");
    } catch (err) {
      setProfileSaved(err instanceof ApiError ? err.message : "Update failed.");
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPwdMessage(null);
    if (!isPasswordValid(newPassword)) {
      setPwdMessage(PASSWORD_HINT);
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdMessage("New passwords do not match.");
      return;
    }
    setPwdSaving(true);
    try {
      const wasForced = mustChangeFirst;
      const from =
        (location.state as { from?: string } | null)?.from && typeof (location.state as { from?: string }).from === "string"
          ? (location.state as { from: string }).from
          : null;
      await apiPost("/api/v1/auth/change-password", {
        currentPassword,
        newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwdMessage("Password changed.");
      await refreshSession();
      if (wasForced) {
        const dest = from && from !== "/settings" && !from.startsWith("/settings/") ? from : "/dashboard";
        navigate(dest, { replace: true });
      }
    } catch (err) {
      setPwdMessage(err instanceof ApiError ? err.message : "Could not change password.");
    } finally {
      setPwdSaving(false);
    }
  }

  function passwordFormSection(options: { heading: string; intro?: string }) {
    return (
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 className="font-h3 text-teal-900 mb-2">{options.heading}</h2>
        {options.intro ? <p className="text-sm text-slate-600 mb-4">{options.intro}</p> : null}
        <form className="space-y-4 max-w-md" onSubmit={changePassword}>
          <div>
            <label className="block text-xs font-label-caps text-slate-500 mb-1 uppercase" htmlFor="cur">
              Current password
            </label>
            <input
              id="cur"
              type="password"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-label-caps text-slate-500 mb-1 uppercase" htmlFor="np">
              New password
            </label>
            <input
              id="np"
              type="password"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <p className="text-[11px] text-slate-500 mt-1">{PASSWORD_HINT}</p>
          </div>
          <div>
            <label className="block text-xs font-label-caps text-slate-500 mb-1 uppercase" htmlFor="cp">
              Confirm new password
            </label>
            <input
              id="cp"
              type="password"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
          </div>
          {pwdMessage && (
            <p className={`text-sm ${pwdMessage.includes("changed.") ? "text-teal-800" : "text-red-700"}`}>{pwdMessage}</p>
          )}
          <button
            type="submit"
            disabled={pwdSaving || !isPasswordValid(newPassword) || newPassword !== confirmPassword}
            className="bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {pwdSaving ? "Updating…" : "Update password"}
          </button>
        </form>
      </section>
    );
  }

  if (mustChangeFirst) {
    return (
      <div className="p-gutter max-w-2xl space-y-6 pb-12">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-950">
          <h1 className="font-h2 text-primary mb-2">Set a new password</h1>
          <p className="text-sm text-amber-900">
            Your account was created with a temporary password. Choose a new password before using the rest of the
            portal.
          </p>
          <p className="text-sm text-slate-700 mt-2 font-mono">
            {sessionUser?.email}
            {sessionUser?.tenant?.code ? (
              <span className="font-sans text-slate-600">
                {" "}
                · Tenant <span className="font-mono">{sessionUser.tenant.code}</span>
              </span>
            ) : null}
          </p>
        </div>
        {passwordFormSection({ heading: "Change password" })}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-gutter flex items-center gap-2 text-slate-600">
        <span className="material-symbols-outlined animate-pulse">progress_activity</span>
        Loading profile…
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="p-gutter max-w-xl">
        <p className="text-red-700 text-sm mb-4">{profileError ?? "No profile."}</p>
        <Link to="/dashboard" className="text-primary font-semibold text-sm hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="p-gutter max-w-2xl space-y-8 pb-12">
      <div>
        <h1 className="font-h2 text-primary">Account settings</h1>
        <p className="text-sm text-slate-600 mt-1">
          {profile.email}
          {profile.tenant?.code ? (
            <span className="text-slate-500">
              {" "}
              · Tenant <span className="font-mono">{profile.tenant.code}</span>
            </span>
          ) : null}
        </p>
      </div>

      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 className="font-h3 text-teal-900 mb-4">Profile</h2>
        <form className="space-y-4" onSubmit={saveProfile}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-label-caps text-slate-500 mb-1 uppercase" htmlFor="fn">
                First name
              </label>
              <input
                id="fn"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-label-caps text-slate-500 mb-1 uppercase" htmlFor="ln">
                Last name
              </label>
              <input
                id="ln"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-label-caps text-slate-500 mb-1 uppercase" htmlFor="ph">
              Phone
            </label>
            <input
              id="ph"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="Optional"
            />
          </div>
          {profileSaved && (
            <p
              className={`text-sm ${profileSaved.includes("No changes") || profileSaved.includes("updated.") ? "text-teal-800" : "text-red-700"}`}
            >
              {profileSaved}
            </p>
          )}
          <button
            type="submit"
            disabled={profileSaving}
            className="bg-primary-container text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {profileSaving ? "Saving…" : "Save profile"}
          </button>
        </form>
      </section>

      {passwordFormSection({ heading: "Change password" })}
    </div>
  );
}
