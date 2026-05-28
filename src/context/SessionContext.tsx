import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { apiGet, apiPost, clearStoredTokens } from "@/lib/api";
import { authBus } from "@/lib/authEvents";

export type SessionTenant = {
  id?: string;
  name?: string;
  code?: string;
  isActive?: boolean;
  config?: {
    primaryColor?: string;
    secondaryColor?: string;
    logoUrl?: string;
    fontPreference?: string;
  };
};

export type SessionUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  /** When true, user must change password (new admin-created account, etc.). */
  mustChangePassword?: boolean;
  /** Cookie session includes nested tenant; JWT auth returns flat tenantId from `/session/status`. */
  tenant?: SessionTenant;
  tenantId?: string;
  /**
   * Permission strings from the RBAC service in `resource:action` form
   * (e.g. `cases:read`). Populated by `/api/v1/session/status`. The backend is
   * authoritative; we mirror its list rather than computing on the frontend.
   */
  permissions?: string[];
};

type SessionStatusPayload = {
  authenticated?: boolean;
  user?: SessionUser | null;
  permissions?: string[];
};

type SessionContextValue = {
  user: SessionUser | null;
  status: "loading" | "ready";
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
  /** Transient banner emitted on 403 responses; consumed and cleared by the UI. */
  forbiddenMessage: string | null;
  clearForbiddenMessage: () => void;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");
  const [forbiddenMessage, setForbiddenMessage] = useState<string | null>(null);
  const clearForbiddenMessage = useCallback(() => setForbiddenMessage(null), []);

  const refresh = useCallback(async () => {
    const data = (await apiGet("/api/v1/session/status")) as SessionStatusPayload;
    if (data.authenticated && data.user) {
      const nextUser: SessionUser = {
        ...data.user,
        mustChangePassword: Boolean(data.user?.mustChangePassword),
        // Hoist top-level `permissions` (the RBAC service result the gateway
        // already publishes alongside the session) onto the user object so the
        // permissions hook has a single place to read it.
        permissions: Array.isArray(data.permissions) ? data.permissions : [],
      };
      /** JWT `/session/status` returns `tenantId` only; cookie session has nested `tenant`. */
      const resolvedTenantId = nextUser.tenant?.id ?? nextUser.tenantId;
      if (resolvedTenantId) {
        nextUser.tenantId = resolvedTenantId;
        nextUser.tenant = { ...(nextUser.tenant ?? {}), id: resolvedTenantId };
      }

      const tenantId = resolvedTenantId;
      // Gateway blocks most routes until password is changed; skip tenant fetch to avoid a false 403 toast.
      if (tenantId && !nextUser.mustChangePassword) {
        try {
          const t = (await apiGet(`/api/v1/tenants/${tenantId}`)) as { tenant?: SessionTenant } | null;
          if (t?.tenant) {
            nextUser.tenant = { ...(nextUser.tenant ?? {}), ...t.tenant };
            if (!nextUser.tenant.id && resolvedTenantId) nextUser.tenant.id = resolvedTenantId;
          }
        } catch {
          // ignore tenant hydration errors (session still valid)
        }
      }
      setUser(nextUser);
    } else {
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } catch {
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setStatus("ready");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const logout = useCallback(async () => {
    try {
      await apiPost("/api/v1/session/logout", {});
    } catch {
      // still clear local session UI
    }
    clearStoredTokens();
    setUser(null);
  }, []);

  /** Wire auth-bus events: session-expired clears the user (RequireAuth then bounces to /login). */
  useEffect(() => {
    return authBus.on((event) => {
      if (event === "expired") {
        clearStoredTokens();
        setUser(null);
      } else if (event === "forbidden") {
        setForbiddenMessage(
          "You don't have permission to perform that action. The request was blocked by the server.",
        );
      }
    });
  }, []);

  const value = useMemo(
    () => ({
      user,
      status,
      refresh,
      logout,
      forbiddenMessage,
      clearForbiddenMessage,
    }),
    [user, status, refresh, logout, forbiddenMessage, clearForbiddenMessage],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const ctx = useContext(SessionContext);
  if (!ctx) {
    throw new Error("useSession must be used within SessionProvider");
  }
  return ctx;
}

/**
 * Returns admin flags for the current session user, derived from the
 * permission list the backend RBAC service returns. We treat:
 *  - `platform:manage_tenants` as the marker permission for **system admin**
 *    (the platform role per seed.js).
 *  - `users:create` as the marker for **tenant admin** (per seed role matrix).
 *
 *  Intentionally uses **exact** permission strings only (no `*`, `admin:*`, or
 *  `resource:*` expansion) so it stays consistent with `<RequireAdmin />` and
 *  nav `adminOnly` items; use `usePermissions().can()` for gateway-aligned checks.
 */
export function useIsAdmin(): {
  isSystemAdmin: boolean;
  isTenantAdmin: boolean;
  isAdmin: boolean;
} {
  const { user } = useSession();
  const perms = new Set(user?.permissions ?? []);
  const isSystemAdmin = perms.has("platform:manage_tenants");
  const isTenantAdmin = perms.has("users:create");
  return {
    isSystemAdmin,
    isTenantAdmin,
    isAdmin: isSystemAdmin || isTenantAdmin,
  };
}
