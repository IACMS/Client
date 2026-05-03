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

export type SessionTenant = {
  id?: string;
  name?: string;
  code?: string;
  isActive?: boolean;
};

export type SessionUser = {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  tenant?: SessionTenant;
};

type SessionStatusPayload = {
  authenticated?: boolean;
  user?: SessionUser | null;
};

type SessionContextValue = {
  user: SessionUser | null;
  status: "loading" | "ready";
  refresh: () => Promise<void>;
  logout: () => Promise<void>;
};

const SessionContext = createContext<SessionContextValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<"loading" | "ready">("loading");

  const refresh = useCallback(async () => {
    const data = (await apiGet("/api/v1/session/status")) as SessionStatusPayload;
    if (data.authenticated && data.user) {
      setUser(data.user);
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

  const value = useMemo(
    () => ({
      user,
      status,
      refresh,
      logout,
    }),
    [user, status, refresh, logout],
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
