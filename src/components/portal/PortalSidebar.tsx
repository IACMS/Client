import { NavLink } from "react-router-dom";

type SidebarLinkItem = {
  placeholder?: false;
  to: string;
  label: string;
  icon: string;
  end?: boolean;
};

type SidebarPlaceholderItem = {
  placeholder: true;
  label: string;
  icon: string;
};

type SidebarItem = SidebarLinkItem | SidebarPlaceholderItem;

const items: SidebarItem[] = [
  { to: "/dashboard", label: "Dashboard", icon: "dashboard", end: true },
  { to: "/cases", label: "Cases", icon: "work", end: false },
  { to: "/workflows", label: "Workflows", icon: "account_tree", end: false },
  { to: "/users", label: "Users", icon: "group", end: false },
  { to: "/agencies", label: "Agencies", icon: "account_balance", end: false },
  { placeholder: true, label: "Tasks", icon: "assignment" },
  { placeholder: true, label: "Reports", icon: "assessment" },
  { to: "/settings/tenant", label: "Settings", icon: "settings", end: false },
  { placeholder: true, label: "Audit", icon: "history" },
];

function linkClassName(isActive: boolean, placeholder?: boolean): string {
  const base =
    "flex items-center gap-3 px-3 py-2 text-sm transition-all duration-200 ease-in-out rounded-md font-inter tracking-tight";
  if (placeholder) {
    return `${base} text-slate-700 dark:text-slate-300 opacity-70 cursor-not-allowed pointer-events-none`;
  }
  if (isActive) {
    return `${base} bg-teal-700 text-white font-semibold`;
  }
  return `${base} text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800`;
}

type Variant = "dashboard" | "cases";

export default function PortalSidebar({ variant }: { variant: Variant }) {
  const isDash = variant === "dashboard";
  const asideClass =
    "fixed left-0 top-16 h-[calc(100vh-4rem)] flex flex-col p-4 gap-2 z-30 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 w-64 transition-all duration-200 ease-in-out hidden md:flex overflow-y-auto";

  return (
    <aside className={asideClass}>
      <div className={`flex items-center gap-3 px-2 ${isDash ? "mb-8" : "mb-6"}`}>
        {isDash ? (
          <>
            <div className="w-10 h-10 rounded-md bg-primary-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white">account_balance</span>
            </div>
            <div>
              <h2 className="font-inter text-sm font-bold text-teal-700 dark:text-teal-400 leading-tight">
                Case Management
              </h2>
              <p className="font-inter text-[10px] text-slate-500 uppercase tracking-wider">Institutional Portal</p>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 mb-1 w-full">
            <div className="bg-primary-container p-2 rounded-lg shrink-0">
              <span className="material-symbols-outlined text-white">account_balance</span>
            </div>
            <div>
              <div className="font-h3 text-sm font-bold text-primary">Case Management</div>
              <div className="font-body-sm text-xs text-slate-500">Institutional Portal</div>
            </div>
          </div>
        )}
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {items.map((item) =>
          item.placeholder === true ? (
            <span key={item.label} title="Coming soon" className={linkClassName(false, true)}>
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </span>
          ) : (
            <NavLink key={item.label} to={item.to} end={item.end} className={({ isActive }) => linkClassName(isActive)}>
              <span className="material-symbols-outlined">{item.icon}</span>
              {item.label}
            </NavLink>
          ),
        )}
      </nav>
      {isDash && (
        <div className="mt-auto p-2">
          <div className="bg-surface-container-low p-3 rounded-lg border border-outline-variant">
            <p className="text-[10px] font-label-caps text-on-surface-variant mb-1">CURRENT TENANT</p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-primary truncate">Dept. of Social Services</span>
              <span className="material-symbols-outlined text-xs cursor-pointer shrink-0" aria-hidden>
                swap_horiz
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
