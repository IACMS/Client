import { NavLink, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useEffect } from "react";
import { useIsAdmin } from "@/context/SessionContext";
import { usePermissions } from "@/permissions/usePermissions";
import { useSidebar } from "@/context/SidebarContext";
import type { Permission } from "@/permissions/roles";

type SidebarLinkItem = {
  placeholder?: false;
  to: string;
  labelKey: string;
  icon: string;
  end?: boolean;
  orPlatformOperator?: boolean;
  hideForPlatformOperator?: boolean;
  adminOnly?: boolean;
  permission?: Permission;
  anyOf?: Permission[];
  allOf?: Permission[];
};

type SidebarPlaceholderItem = {
  placeholder: true;
  labelKey: string;
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
  if (item.hideForPlatformOperator && check.isPlatformOperator) return false;
  if (item.adminOnly) return check.isAdmin;
  if (item.orPlatformOperator && check.isPlatformOperator) return true;
  if (item.allOf?.length) return check.allOf(...item.allOf);
  if (item.anyOf?.length) return check.anyOf(...item.anyOf);
  if (item.permission) return check.can(item.permission);
  return true;
}

const items: SidebarItem[] = [
  { to: "/dashboard", labelKey: "nav.dashboard", icon: "dashboard", end: true },
  {
    to: "/cases",
    labelKey: "nav.cases",
    icon: "work",
    end: false,
    permission: "cases:read",
  },
  {
    to: "/referrals",
    labelKey: "nav.referrals",
    icon: "move_to_inbox",
    end: false,
    permission: "referrals:read",
  },
  {
    to: "/workflows",
    labelKey: "nav.workflows",
    icon: "account_tree",
    end: false,
    permission: "workflows:read",
  },
  {
    to: "/users",
    labelKey: "nav.users",
    icon: "group",
    end: false,
    adminOnly: true,
    hideForPlatformOperator: true,
  },
  {
    to: "/settings/roles",
    labelKey: "nav.rolesAndPermissions",
    icon: "shield_person",
    end: false,
    adminOnly: true,
    hideForPlatformOperator: true,
  },
  {
    to: "/integrations/api-keys",
    labelKey: "nav.partnerApiKeys",
    icon: "key",
    end: false,
    adminOnly: true,
    hideForPlatformOperator: true,
  },
  {
    to: "/integrations/webhooks",
    labelKey: "nav.webhooks",
    icon: "webhook",
    end: false,
    adminOnly: true,
    hideForPlatformOperator: true,
  },
  {
    to: "/agencies",
    labelKey: "nav.agencies",
    icon: "account_balance",
    end: false,
    allOf: ["cases:read", "tenants:read"],
    orPlatformOperator: true,
  },
  {
    to: "/api-health",
    labelKey: "nav.api",
    icon: "lan",
    end: false,
    permission: "platform:manage_tenants",
  },
  {
    to: "/platform/users",
    labelKey: "nav.platformUsers",
    icon: "manage_accounts",
    end: false,
    permission: "platform:manage_tenants",
  },
  {
    to: "/platform/roles",
    labelKey: "nav.platformRoles",
    icon: "admin_panel_settings",
    end: false,
    permission: "platform:manage_tenants",
  },
  {
    to: "/platform/settings",
    labelKey: "nav.platformSettings",
    icon: "tune",
    end: false,
    permission: "platform:manage_tenants",
  },
  {
    to: "/platform/announcements",
    labelKey: "nav.platformAnnouncements",
    icon: "campaign",
    end: false,
    permission: "platform:manage_tenants",
  },
  {
    to: "/platform/support",
    labelKey: "nav.platformSupport",
    icon: "support_agent",
    end: false,
    permission: "platform:manage_tenants",
  },
  {
    to: "/platform/resources",
    labelKey: "nav.platformResources",
    icon: "storage",
    end: false,
    permission: "platform:manage_tenants",
  },
  {
    to: "/audit",
    labelKey: "nav.audit",
    icon: "history",
    end: false,
    permission: "audit:read",
    hideForPlatformOperator: true,
  },
  {
    to: "/chat",
    labelKey: "nav.chat",
    icon: "chat",
    end: false,
    permission: "cases:read",
  },
  {
    to: "/tasks",
    labelKey: "nav.tasks",
    icon: "assignment",
    end: false,
    permission: "cases:read",
  },
  {
    to: "/reports",
    labelKey: "nav.reports",
    icon: "assessment",
    end: false,
    permission: "cases:read",
  },
  {
    to: "/settings/departments",
    labelKey: "nav.departments",
    icon: "corporate_fare",
    end: false,
    adminOnly: true,
    hideForPlatformOperator: true,
  },
  {
    to: "/settings/tenant",
    labelKey: "nav.settings",
    icon: "settings",
    end: false,
    adminOnly: true,
    hideForPlatformOperator: true,
  },
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
  const { t } = useTranslation();
  const isDash = variant === "dashboard";
  const { isAdmin, isSystemAdmin: isPlatformOperator } = useIsAdmin();
  const { can, anyOf, allOf } = usePermissions();
  const { open, close } = useSidebar();
  const location = useLocation();

  // Close mobile sidebar whenever the route changes (user tapped a link)
  useEffect(() => {
    close();
  }, [location.pathname, close]);

  // Lock body scroll when sidebar is open on mobile
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const visibleItems = items.filter((item) =>
    item.placeholder === true
      ? true
      : linkVisible(item, { isAdmin, isPlatformOperator, can, anyOf, allOf }),
  );

  const sidebarContent = (
    <>
      <div className={`flex items-center gap-3 px-2 ${isDash ? "mb-8" : "mb-6"}`}>
        {isDash ? (
          <>
            <div className="w-10 h-10 rounded-md bg-primary-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-white">
                account_balance
              </span>
            </div>
            <div>
              <h2 className="font-inter text-sm font-bold text-primary leading-tight">
                {t("portal.caseManagement")}
              </h2>
              <p className="font-inter text-[10px] text-slate-500 uppercase tracking-wider">
                {t("portal.institutionalPortal")}
              </p>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-3 mb-1 w-full">
            <div className="bg-primary-container p-2 rounded-lg shrink-0">
              <span className="material-symbols-outlined text-white">
                account_balance
              </span>
            </div>
            <div>
              <div className="font-h3 text-sm font-bold text-primary">
                {t("portal.caseManagement")}
              </div>
              <div className="font-body-sm text-xs text-slate-500">
                {t("portal.institutionalPortal")}
              </div>
            </div>
          </div>
        )}
      </div>
      <nav className="flex flex-col gap-1 flex-1">
        {visibleItems.map((item) =>
          item.placeholder === true ? (
            <span
              key={item.labelKey}
              title={t("common.comingSoon")}
              className={linkClassName(false, true)}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {t(item.labelKey)}
            </span>
          ) : (
            <NavLink
              key={item.labelKey}
              to={item.to}
              end={item.end}
              className={({ isActive }) => linkClassName(isActive)}
            >
              <span className="material-symbols-outlined">{item.icon}</span>
              {t(item.labelKey)}
            </NavLink>
          ),
        )}
      </nav>
    </>
  );

  return (
    <>
      {/* ── Desktop sidebar (md+): always visible, fixed ── */}
      <aside className="fixed left-0 top-16 h-[calc(100vh-4rem)] flex-col p-4 gap-2 z-30 bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 w-64 hidden md:flex overflow-y-auto">
        {sidebarContent}
      </aside>

      {/* ── Mobile overlay backdrop ── */}
      {open && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          aria-hidden="true"
          onClick={close}
        />
      )}

      {/* ── Mobile slide-in sidebar ── */}
      <aside
        className={`
          fixed left-0 top-16 h-[calc(100vh-4rem)] flex flex-col p-4 gap-2 z-50
          bg-slate-50 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800
          w-72 overflow-y-auto shadow-2xl
          transition-transform duration-300 ease-in-out
          md:hidden
          ${open ? "translate-x-0" : "-translate-x-full"}
        `}
        aria-label="Navigation menu"
      >
        {sidebarContent}
      </aside>
    </>
  );
}
