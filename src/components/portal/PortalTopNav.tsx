import { NavLink } from "react-router-dom";

const AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuBV2ib7TtT1k_BFCUY7xGZUcQhPs164AcQhoSf4bkAr0t04NGWeFF0ZKlPZHHJzCIh7lHdArZ6crH3XCvwlLBouCesn_YhWxeuiZfIP1eq2MWxstjtPlkUaniP5PcPixY6iGeNjZceCvmvmyh13Ph-CcZfBjl9XC0EKt6yCI9_A_D9CjDAd8sfyD0Uc2t4yYeIeqJNO5d1S_B2yK3NyHrUPDkzAdsYzkpDUJUJzws5r94W6DZQTYI90HKcHlIo72ipQpO6nOKYU3Vk";

/** Shared top chrome for portal routes (`/dashboard`, `/cases`, `/agencies`, case detail). */
export default function PortalTopNav() {
  return (
    <header className="relative z-50 bg-white dark:bg-slate-900 flex h-16 flex-nowrap items-center justify-between gap-3 px-4 sm:px-6 w-full shrink-0 sticky top-0 border-b border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="flex items-center gap-3 lg:gap-6 min-w-0 overflow-hidden flex-1">
        <NavLink to="/" className="text-lg sm:text-xl font-bold text-teal-900 dark:text-teal-100 font-h2 shrink-0 whitespace-nowrap">
          IACMS
        </NavLink>
        <div className="hidden md:flex items-center min-w-0">
          <nav className="flex items-center gap-0.5 sm:gap-1 ml-1 sm:ml-2 border-l border-slate-200 pl-3 sm:pl-4 lg:pl-6 h-full min-w-0 overflow-x-auto">
            <NavLink
              to="/cases"
              end={false}
              className={({ isActive }) =>
                `${
                  isActive
                    ? "text-teal-700 dark:text-teal-400 border-b-2 border-teal-700 dark:border-teal-400"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                } px-3 font-inter text-sm font-medium h-full flex items-center transition-colors whitespace-nowrap`
              }
            >
              Cases
            </NavLink>
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `${
                  isActive ? "text-teal-700 border-b-2 border-teal-700" : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                } px-3 font-inter text-sm font-medium h-full flex items-center transition-colors whitespace-nowrap`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/agencies"
              end={false}
              className={({ isActive }) =>
                `${
                  isActive
                    ? "text-teal-700 dark:text-teal-400 border-b-2 border-teal-700 dark:border-teal-400"
                    : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
                } px-3 font-inter text-sm font-medium h-full flex items-center transition-colors whitespace-nowrap`
              }
            >
              Agencies
            </NavLink>
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
        <button type="button" className="text-slate-600 dark:text-slate-400 hover:bg-slate-50 p-2 rounded-full cursor-pointer transition-colors">
          <span className="material-symbols-outlined">settings</span>
        </button>
        <div className="h-8 w-px bg-slate-200 mx-2" />
        <button
          type="button"
          className="hidden lg:flex items-center gap-2 px-2 sm:px-3 py-1.5 rounded-lg border border-outline hover:bg-slate-50 text-xs sm:text-sm font-medium font-inter text-on-surface max-w-[9rem]"
        >
          <span className="truncate">Tenant Switcher</span>
          <span className="material-symbols-outlined text-sm">expand_more</span>
        </button>
        <img alt="" className="w-8 h-8 rounded-full border border-slate-200 object-cover" src={AVATAR} />
      </div>
    </header>
  );
}
