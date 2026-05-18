import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { useIsAdmin, useSession } from "@/context/SessionContext";
import { usePermissions } from "@/permissions/usePermissions";
import { getApiBase } from "@/lib/api";

const AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBV2ib7TtT1k_BFCUY7xGZUcQhPs164AcQhoSf4bkAr0t04NGWeFF0ZKlPZHHJzCIh7lHdArZ6crH3XCvwlLBouCesn_YhWxeuiZfIP1eq2MWxstjtPlkUaniU5PcPixY6iGeNjZceCvmvmyh13Ph-CcZfBjl9XC0EKt6yCI9_A_D9CjDAd8sfyD0Uc2t4yYeIeqJNO5d1S_B2yK3NyHrUPDkzAdsYzkpDUJUJzws5r94W6DZQTYI90HKcHlIo72ipQpO6nOKYU3Vk";

/** Shared top chrome for portal routes (`/dashboard`, `/cases`, `/agencies`, case detail). */
export default function PortalTopNav() {
  const { user, logout } = useSession();
  const navigate = useNavigate();
  const { can, allOf } = usePermissions();
  const { isSystemAdmin } = useIsAdmin();
  const showCases = can("cases:read");
  const showAgencies = isSystemAdmin || allOf("cases:read", "tenants:read");
  const apiBase = getApiBase();
  const rawLogoUrl = user?.tenant?.config?.logoUrl;
  const logoUrl = rawLogoUrl && rawLogoUrl.startsWith("/") ? `${apiBase}${rawLogoUrl}` : rawLogoUrl;
  const tenantName = user?.tenant?.name ?? "IACMS";

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!accountMenuOpen) return;
    function handlePointerDown(e: PointerEvent) {
      const el = accountMenuRef.current;
      if (el && !el.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [accountMenuOpen]);

  async function handleSignOut() {
    setAccountMenuOpen(false);
    await logout();
    navigate("/login", { replace: true });
  }

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || user?.email || "Account";

  return (
    <header className="relative z-50 bg-white dark:bg-slate-900 flex h-16 flex-nowrap items-center justify-between gap-3 px-4 sm:px-6 w-full shrink-0 sticky top-0 border-b border-slate-200 dark:border-slate-800">
      <div className="flex items-center gap-3 lg:gap-6 min-w-0 overflow-hidden flex-1">
        <NavLink
          to="/"
          className="flex items-center gap-2 text-lg sm:text-xl font-bold text-primary dark:text-teal-100 font-h2 shrink-0 whitespace-nowrap"
          aria-label={tenantName}
        >
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={tenantName}
              className="h-8 w-auto object-contain"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
          ) : null}
          <span className={logoUrl ? "sr-only" : ""}>{tenantName}</span>
        </NavLink>
        <div className="hidden md:flex items-center min-w-0">
          <nav className="flex items-center gap-0.5 sm:gap-1 ml-1 sm:ml-2 border-l border-slate-200 pl-3 sm:pl-4 lg:pl-6 h-full min-w-0 overflow-x-auto">
            {showCases && (
              <NavLink
                to="/cases"
                end={false}
                className={({ isActive }) =>
                  `${
                    isActive
                      ? "text-primary border-b-2 border-primary"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  } px-3 font-inter text-sm font-medium h-full flex items-center transition-colors whitespace-nowrap`
                }
              >
                Cases
              </NavLink>
            )}
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `${
                  isActive ? "text-primary border-b-2 border-primary" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                } px-3 font-inter text-sm font-medium h-full flex items-center transition-colors whitespace-nowrap`
              }
            >
              Dashboard
            </NavLink>
            {showAgencies && (
              <NavLink
                to="/agencies"
                end={false}
                className={({ isActive }) =>
                  `${
                    isActive
                      ? "text-primary border-b-2 border-primary"
                      : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                  } px-3 font-inter text-sm font-medium h-full flex items-center transition-colors whitespace-nowrap`
                }
              >
                Agencies
              </NavLink>
            )}
          </nav>
        </div>
      </div>
      <div className="flex items-center gap-1 sm:gap-2 md:gap-4 shrink-0">
        <div className="relative hidden xl:block">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
            search
          </span>
          <input
            className="bg-slate-100 border-none rounded-lg pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-primary w-48 2xl:w-64 max-w-[12rem]"
            placeholder="Global Search..."
            type="search"
            aria-label="Global search"
          />
        </div>
        <button type="button" className="text-slate-600 dark:text-slate-400 hover:bg-slate-50 p-2 rounded-full cursor-pointer transition-colors">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <div className="h-8 w-px bg-slate-200 mx-2 hidden sm:block" aria-hidden />
        <button
          type="button"
          className="hidden lg:flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg border border-outline hover:bg-slate-50 text-xs sm:text-sm font-medium font-inter text-on-surface max-w-[12rem]"
          title="Current tenant from session"
        >
          <span className="truncate">{user?.tenant?.code ?? "Tenant"}</span>
          <span className="material-symbols-outlined text-sm shrink-0">expand_more</span>
        </button>

        <div className="relative z-[60]" ref={accountMenuRef}>
          <button
            type="button"
            onClick={() => setAccountMenuOpen((o) => !o)}
            className="flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-600 p-0.5 pl-1 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-expanded={accountMenuOpen}
            aria-haspopup="menu"
            aria-label="Account menu"
          >
            <img alt="" className="w-8 h-8 rounded-full object-cover" src={AVATAR} />
            <span className="material-symbols-outlined text-slate-500 text-sm pr-1 hidden sm:inline">
              expand_more
            </span>
          </button>

          {accountMenuOpen ? (
            <div
              className="absolute right-0 top-full mt-1 w-64 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-xl py-2 z-[200]"
              role="menu"
            >
              <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate" title={displayName}>
                  {displayName}
                </p>
                <p className="text-xs text-slate-500 truncate" title={user?.email}>
                  {user?.email ?? ""}
                </p>
              </div>
              <Link
                to="/settings"
                role="menuitem"
                className="flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
                onClick={() => setAccountMenuOpen(false)}
              >
                <span className="material-symbols-outlined text-[18px] text-slate-500">settings</span>
                Account settings
              </Link>
              <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
              <button
                type="button"
                role="menuitem"
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 text-left"
                onClick={() => void handleSignOut()}
              >
                <span className="material-symbols-outlined text-[18px] text-slate-500">logout</span>
                Sign out
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
