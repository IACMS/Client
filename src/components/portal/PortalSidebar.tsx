import { NavLink } from "react-router-dom";
import { useIsAdmin } from "@/context/SessionContext";
import { usePermissions } from "@/permissions/usePermissions";
import type { Permission } from "@/permissions/roles";

type SidebarLinkItem = {
  placeholder?: false;
  to: string;
  label: string;
  icon: string;
  end?: boolean;
  /** If true, also visible when `isPlatformOperator` (session has exact `platform:manage_tenants`). */
  orPlatformOperator?: boolean;
  /** Same check as `<RequireAdmin />` — exact session perms only (not `*` / `users:*` wildcards). */
  adminOnly?: boolean;
  /** Hide the link unless the user holds this permission (unless anyOf/allOf are set). Ignored when adminOnly is true. */
  permission?: Permission;
  /** OR — show when any of these match `permissionAllowed` semantics. */
  anyOf?: Permission[];
  /** AND — show only when all match. */
  allOf?: Permission[];
};

type SidebarPlaceholderItem = {
  placeholder: true;
  label: string;
  icon: string;
};

type SidebarItem = SidebarLinkItem | SidebarPlaceholderItem;

function linkVisible(
  item: SidebarLinkItem,
  check: {
    isAdmin: boolean;
    isPlatformOperator: boolean;
    can: (p: Permission) => boolean;
    anyOf: (...ps: Permission[]) => boolean;
    allOf: (...ps: Permission[]) => boolean;
  },
): boolean {
  if (item.adminOnly) return check.isAdmin;
  if (item.orPlatformOperator && check.isPlatformOperator) return true;
  if (item.allOf?.length) return check.allOf(...item.allOf);
  if (item.anyOf?.length) return check.anyOf(...item.anyOf);
  if (item.permission) return check.can(item.permission);
  return true;
}

const items: SidebarItem[] = [
  // Intentionally ungated: home for every signed-in user; dashboard API slices may return empty per RBAC.
  { to: "/dashboard", label: "Dashboard", icon: "dashboard", end: true },
  // Cases list + detail use case APIs gated as cases:read.
  { to: "/cases", label: "Cases", icon: "work", end: false, permission: "cases:read" },
  // Workflow list matches gateway GET /workflows; designer allows workflows:read (view) or update (edit).
  { to: "/workflows", label: "Workflows", icon: "account_tree", end: false, permission: "workflows:read" },
  // Matches <RequireAdmin /> — must use useIsAdmin, not can(), so wildcards don’t widen access vs the route.
  { to: "/users", label: "Users", icon: "group", end: false, adminOnly: true },
  // Tenant staff: cases + tenant APIs. Platform operators: directory only (no case/workflow APIs).
  { to: "/agencies", label: "Agencies", icon: "account_balance", end: false, allOf: ["cases:read", "tenants:read"], orPlatformOperator: true },
  {
    to: "/api-health",
    label: "API",
    icon: "lan",
    end: false,
    permission: "platform:manage_tenants",
  },
  { placeholder: true, label: "Tasks", icon: "assignment" },
  { placeholder: true, label: "Reports", icon: "assessment" },
  // Same guard as /users (<RequireAdmin />).
  {
    to: "/settings/tenant",
    label: "Settings",
    icon: "settings",
    end: false,
    adminOnly: true,
  },
  { placeholder: true, label: "Audit", icon: "history" },
];

function linkClassName(isActive: boolean, placeholder?: boolean): string {
  const base =
    "flex items-center gap-3 px-3 py-2 text-sm transition-all duration-200 ease-in-out rounded-md font-inter tracking-tight";
  if (placeholder) {
    return `${base} text-slate-700 dark:text-slate-300 opacity-70 cursor-not-allowed pointer-events-none`;
  }
  if (isActive) {
    return `${base} bg-primary text-white font-semibold`;
  }
  return `${base} text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800`;
}

type Variant = "dashboard" | "cases";

export default function PortalSidebar({ variant }: { variant: Variant }) {
  const isDash = variant === "dashboard";
  const { isAdmin, isSystemAdmin: isPlatformOperator } = useIsAdmin();
  const { can, anyOf, allOf } = usePermissions();
  const visibleItems = items.filter((item) =>
    item.placeholder === true ? true : linkVisible(item, { isAdmin, isPlatformOperator, can, anyOf, allOf }),
  );
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
              <h2 className="font-inter text-sm font-bold text-primary leading-tight">
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
        {visibleItems.map((item) =>
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
    </aside>
  );
}
