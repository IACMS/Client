import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSession } from "./SessionContext";
import {
  enableBrowserPush,
  fetchNotifications,
  isDesktopNotificationPermitted,
  markAllNotificationsAsRead,
  markNotificationAsRead,
  showDesktopNotification,
  type NotificationItem,
} from "@/lib/notificationApi";
import { ChatWebSocketClient } from "@/lib/chatApi";

interface NotificationContextValue {
  notifications: NotificationItem[];
  unreadCount: number;
  isPushSupported: boolean;
  isPushGranted: boolean;
  requestPushPermission: () => Promise<boolean>;
  sendTestNotification: () => void;
  markAsRead: (id: string) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

/** Play a subtle modern chime using Web Audio API */
function playChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15); // A5

    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start();
    osc.stop(ctx.currentTime + 0.35);
  } catch {
    // Ignore audio autoplay restrictions
  }
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPushGranted, setIsPushGranted] = useState(isDesktopNotificationPermitted());
  const isPushSupported =
    typeof window !== "undefined" && "Notification" in window;

  const wsClientRef = useRef<ChatWebSocketClient | null>(null);

  // Sync push permission state on focus/mount
  useEffect(() => {
    function checkPermission() {
      setIsPushGranted(isDesktopNotificationPermitted());
    }
    checkPermission();
    window.addEventListener("focus", checkPermission);
    return () => window.removeEventListener("focus", checkPermission);
  }, []);

  const refresh = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await fetchNotifications(30);
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Quiet fail if service not yet ready
    }
  }, [user?.id]);

  useEffect(() => {
    if (user?.id) {
      void refresh();
    } else {
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user?.id, refresh]);

  // Global WebSocket listener for real-time notifications across the entire app
  useEffect(() => {
    if (!user?.id) return;

    const token = localStorage.getItem("iacms.accessToken");
    if (!token) return;

    const ws = new ChatWebSocketClient(token);
    wsClientRef.current = ws;
    ws.connect();

    const unsub = ws.onMessage((msg: any) => {
      // 1. Direct system/case/chat notifications from notification-service
      if (msg.type === "NOTIFICATION_CREATED") {
        const notifData = msg.data || {};
        if (notifData.recipientId === user.id) {
          playChime();
          const newNotifItem: NotificationItem = {
            id: notifData.notificationId || `notif_${Date.now()}`,
            recipientId: user.id,
            type: notifData.notificationType || "GENERAL",
            title: notifData.title || "New Notification",
            body: notifData.body || "",
            data: notifData.data || {},
            isRead: false,
            createdAt: notifData.createdAt || new Date().toISOString(),
          };

          setNotifications((prev) => [newNotifItem, ...prev.slice(0, 49)]);
          setUnreadCount((c) => c + 1);

          // Check if actively reading this exact conversation
          const activeConvId = (window as any).__iacmsActiveConversationId;
          const convId = notifData.data?.conversationId;
          const isActivelyChattingHere =
            convId &&
            document.hasFocus() &&
            !document.hidden &&
            window.location.pathname === "/chat" &&
            activeConvId === convId;

          if (!isActivelyChattingHere) {
            showDesktopNotification(
              newNotifItem.title,
              {
                body: newNotifItem.body,
                tag: notifData.notificationId || `notif-${Date.now()}`,
                data: notifData.data,
              },
              () => {
                window.focus();
                if (convId) {
                  window.location.href = `/chat`;
                } else if (notifData.data?.caseId) {
                  window.location.href = `/cases/${notifData.data.caseId}`;
                }
              }
            );
          }
        }
      }

      // 2. Incoming chat activity
      if (msg.type === "CONVERSATION_ACTIVITY") {
        const { conversationId, message } = msg.data || {};
        if (message && message.senderId !== user.id) {
          playChime();
          const senderName = message.sender
            ? `${message.sender.firstName || ""} ${message.sender.lastName || ""}`.trim() || message.sender.email || "Someone"
            : "Someone";

          const newNotif: NotificationItem = {
            id: `chat_${message.id || Date.now()}`,
            recipientId: user.id,
            type: "CHAT_MESSAGE",
            title: `New message from ${senderName}`,
            body: message.content || "Sent an attachment",
            data: { conversationId, messageId: message.id },
            isRead: false,
            createdAt: message.createdAt || new Date().toISOString(),
          };

          setNotifications((prev) => [newNotif, ...prev.slice(0, 49)]);
          setUnreadCount((c) => c + 1);

          // Trigger desktop alert if user is in background, another app, another page, or another chat
          const activeConvId = (window as any).__iacmsActiveConversationId;
          const isActivelyChattingHere =
            document.hasFocus() &&
            !document.hidden &&
            window.location.pathname === "/chat" &&
            activeConvId === conversationId;

          if (!isActivelyChattingHere) {
            showDesktopNotification(
              newNotif.title,
              {
                body: newNotif.body,
                tag: `chat-${conversationId}`,
                data: { conversationId },
              },
              () => {
                window.focus();
                window.location.href = `/chat`;
              }
            );
          }
        }
      }
    });

    return () => {
      unsub();
      ws.disconnect();
      wsClientRef.current = null;
    };
  }, [user?.id]);

  const requestPushPermission = useCallback(async () => {
    const success = await enableBrowserPush(user?.id);
    setIsPushGranted(isDesktopNotificationPermitted());
    return success;
  }, [user?.id]);

  const sendTestNotification = useCallback(() => {
    playChime();
    showDesktopNotification(
      "IACMS Desktop Alert",
      {
        body: "Test notification: Desktop notifications are active and working on your computer!",
        tag: `test-${Date.now()}`,
      },
      () => {
        window.focus();
      }
    );
  }, []);

  const markAsRead = useCallback(async (id: string) => {
    try {
      await markNotificationAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // Ignore
    }
  }, []);

  const markAllAsRead = useCallback(async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Ignore
    }
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        notifications,
        unreadCount,
        isPushSupported,
        isPushGranted,
        requestPushPermission,
        sendTestNotification,
        markAsRead,
        markAllAsRead,
        refresh,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return ctx;
}
