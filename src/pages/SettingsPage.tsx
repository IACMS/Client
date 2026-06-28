import { FormEvent, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import PasswordInput from "@/components/PasswordInput";
import { useSession } from "@/context/SessionContext";
import { ApiError, apiGet, apiPatch, apiPost } from "@/lib/api";
import { getPasswordHint, isPasswordValid } from "@/lib/passwordRules";

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
  const { t } = useTranslation();
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
  const [profileSavedOk, setProfileSavedOk] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwdSaving, setPwdSaving] = useState(false);
  const [pwdMessage, setPwdMessage] = useState<string | null>(null);
  const [pwdMessageOk, setPwdMessageOk] = useState(true);

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
          setProfileError(err instanceof ApiError ? err.message : t("settings.loadFailed"));
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
        setProfileSavedOk(true);
        setProfileSaved(t("settings.noChanges"));
        return;
      }
      await apiPatch("/api/v1/auth/profile", body);
      await refreshSession();
      setProfileSavedOk(true);
      setProfileSaved(t("settings.profileUpdated"));
    } catch (err) {
      setProfileSavedOk(false);
      setProfileSaved(err instanceof ApiError ? err.message : t("settings.updateFailed"));
    } finally {
      setProfileSaving(false);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setPwdMessage(null);
    if (!isPasswordValid(newPassword)) {
      setPwdMessage(getPasswordHint());
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwdMessageOk(false);
      setPwdMessage(t("settings.passwordMismatch"));
      return;
    }
    setPwdSaving(true);
    try {
      const wasForced = mustChangeFirst;
      const from =
        (location.state as { from?: string } | null)?.from && typeof (location.state as { from?: string }).from === "string"
          ? (location.state as { from: string }).from
          : null;
      const body: { newPassword: string; currentPassword?: string } = { newPassword };
      if (!mustChangeFirst) body.currentPassword = currentPassword;
      await apiPost("/api/v1/auth/change-password", body);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPwdMessageOk(true);
      setPwdMessage(t("settings.passwordChanged"));
      await refreshSession();
      if (wasForced) {
        const dest = from && from !== "/settings" && !from.startsWith("/settings/") ? from : "/dashboard";
        navigate(dest, { replace: true });
      }
    } catch (err) {
      setPwdMessageOk(false);
      setPwdMessage(err instanceof ApiError ? err.message : t("settings.passwordChangeFailed"));
    } finally {
      setPwdSaving(false);
    }
  }

  function passwordFormSection(options: { heading: string; intro?: string; firstLogin?: boolean }) {
    const firstLogin = options.firstLogin === true;
    const canSubmit =
      isPasswordValid(newPassword) &&
      newPassword === confirmPassword &&
      (firstLogin || currentPassword.length > 0);

    return (
      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 className="font-h3 text-teal-900 mb-2">{options.heading}</h2>
        {options.intro ? <p className="text-sm text-slate-600 mb-4">{options.intro}</p> : null}
        <form className="space-y-4 max-w-md" onSubmit={changePassword}>
          {!firstLogin ? (
            <PasswordInput
              id="cur"
              label={t("settings.currentPassword")}
              value={currentPassword}
              onChange={setCurrentPassword}
              autoComplete="current-password"
              required
            />
          ) : null}
          <PasswordInput
            id="np"
            label={t("settings.newPassword")}
            value={newPassword}
            onChange={setNewPassword}
            autoComplete="new-password"
            required
            hint={getPasswordHint()}
          />
          <PasswordInput
            id="cp"
            label={t("settings.confirmPassword")}
            value={confirmPassword}
            onChange={setConfirmPassword}
            autoComplete="new-password"
            required
          />
          {pwdMessage && (
            <p className={`text-sm ${pwdMessageOk ? "text-teal-800" : "text-red-700"}`}>{pwdMessage}</p>
          )}
          <button
            type="submit"
            disabled={pwdSaving || !canSubmit}
            className="bg-slate-800 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {pwdSaving ? t("settings.updating") : firstLogin ? t("settings.setPasswordContinue") : t("settings.updatePassword")}
          </button>
        </form>
      </section>
    );
  }

  if (mustChangeFirst) {
    return (
      <div className="p-gutter max-w-2xl space-y-6 pb-12">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-amber-950">
          <h1 className="font-h2 text-primary mb-2">{t("settings.forcedTitle")}</h1>
          <p className="text-sm text-amber-900">{t("settings.forcedIntro")}</p>
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
        {passwordFormSection({
          heading: t("settings.setPassword"),
          firstLogin: true,
        })}
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-gutter flex items-center gap-2 text-slate-600">
        <span className="material-symbols-outlined animate-pulse">progress_activity</span>
        {t("settings.loadingProfile")}
      </div>
    );
  }

  if (profileError || !profile) {
    return (
      <div className="p-gutter max-w-xl">
        <p className="text-red-700 text-sm mb-4">{profileError ?? t("settings.noProfile")}</p>
        <Link to="/dashboard" className="text-primary font-semibold text-sm hover:underline">
          {t("settings.backToDashboard")}
        </Link>
      </div>
    );
  }

  return (
    <div className="p-gutter max-w-2xl space-y-8 pb-12">
      <div>
        <h1 className="font-h2 text-primary">{t("settings.title")}</h1>
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
        <h2 className="font-h3 text-teal-900 mb-2">{t("settings.languageSection")}</h2>
        <p className="text-sm text-slate-600 mb-4">{t("settings.languageHint")}</p>
        <LanguageSwitcher variant="full" className="max-w-md" />
      </section>

      <section className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 className="font-h3 text-teal-900 mb-4">{t("settings.profile")}</h2>
        <form className="space-y-4" onSubmit={saveProfile}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-label-caps text-slate-500 mb-1 uppercase" htmlFor="fn">
                {t("settings.firstName")}
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
                {t("settings.lastName")}
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
              {t("settings.phone")}
            </label>
            <input
              id="ph"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("common.optional")}
            />
          </div>
          {profileSaved && (
            <p className={`text-sm ${profileSavedOk ? "text-teal-800" : "text-red-700"}`}>{profileSaved}</p>
          )}
          <button
            type="submit"
            disabled={profileSaving}
            className="bg-primary-container text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
          >
            {profileSaving ? t("settings.saving") : t("settings.saveProfile")}
          </button>
        </form>
      </section>

      {passwordFormSection({ heading: t("settings.changePassword") })}
    </div>
  );
}
