import { apiGet, apiPatch, apiPost } from "./api";

export type NotificationItem = {
  id: string;
  recipientId: string;
  type: string;
  title: string;
  body: string;
  data?: {
    conversationId?: string;
    messageId?: string;
    caseId?: string;
    url?: string;
    [key: string]: any;
  };
  isRead: boolean;
  createdAt: string;
};

export type NotificationsResponse = {
  unreadCount: number;
  notifications: NotificationItem[];
};

export async function fetchNotifications(limit = 20, unreadOnly = false): Promise<NotificationsResponse> {
  const query = new URLSearchParams({ limit: String(limit), unreadOnly: String(unreadOnly) });
  const data = (await apiGet(`/api/v1/notifications?${query.toString()}`)) as any;
  return {
    unreadCount: data?.unreadCount || 0,
    notifications: Array.isArray(data?.notifications) ? data.notifications : [],
  };
}

export async function markNotificationAsRead(id: string): Promise<void> {
  await apiPatch(`/api/v1/notifications/${id}/read`, {});
}

export async function markAllNotificationsAsRead(): Promise<void> {
  await apiPatch("/api/v1/notifications/read-all", {});
}

export async function getVapidPublicKey(): Promise<string | null> {
  try {
    const data = (await apiGet("/api/v1/notifications/vapid-public-key")) as any;
    return data?.publicKey || null;
  } catch {
    return null;
  }
}

export async function registerPushSubscription(subscription: any, userId?: string): Promise<void> {
  try {
    await apiPost("/api/v1/notifications/push-subscription", { subscription, userId });
  } catch (err) {
    console.warn("[Push] Could not register push subscription with backend:", err);
  }
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function isDesktopNotificationPermitted(): boolean {
  return typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted";
}

/**
 * Display a desktop notification using Service Worker or native HTML5 Notification API.
 */
export function showDesktopNotification(
  title: string,
  options: {
    body?: string;
    tag?: string;
    icon?: string;
    badge?: string;
    data?: any;
  } = {},
  onClick?: () => void
): void {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;

  const notifOptions: NotificationOptions = {
    body: options.body || "",
    icon: options.icon || "/favicon.ico",
    badge: options.badge || "/favicon.ico",
    tag: options.tag || `iacms-${Date.now()}`,
    data: options.data,
  };

  let shown = false;

  // Try standard Notification first for instant interactive desktop toast
  try {
    const notif = new Notification(title, notifOptions);
    shown = true;
    notif.onclick = () => {
      window.focus();
      if (onClick) onClick();
      notif.close();
    };
  } catch {
    // Some browsers require serviceWorker.showNotification
    shown = false;
  }

  if (!shown && "serviceWorker" in navigator) {
    navigator.serviceWorker.ready
      .then((reg) => {
        return reg.showNotification(title, notifOptions);
      })
      .catch((e) => {
        console.warn("[Notification] Failed to show via service worker:", e);
      });
  }
}

/**
 * Register service worker, request notification permission, and subscribe to native/web push.
 */
export async function enableBrowserPush(userId?: string): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.warn("[Push] Notifications not supported in this browser.");
    return false;
  }

  // 1. Request Notification permission
  let permission = Notification.permission;
  if (permission !== "granted") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    console.warn("[Push] Notification permission was not granted:", permission);
    return false;
  }

  // 2. Register Service Worker
  let registration: ServiceWorkerRegistration | null = null;
  if ("serviceWorker" in navigator) {
    try {
      registration = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;
    } catch (swErr) {
      console.warn("[Push] ServiceWorker registration warning:", swErr);
    }
  }

  // 3. Attempt PushManager Web Push subscription (for background push delivery)
  if (registration && "PushManager" in window) {
    try {
      const vapidKey = await getVapidPublicKey();
      if (vapidKey) {
        const applicationServerKey = urlBase64ToUint8Array(vapidKey);
        let subscription = await registration.pushManager.getSubscription();

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey.buffer,
          });
        }

        if (subscription) {
          await registerPushSubscription(subscription.toJSON(), userId);
        }
      }
    } catch (pushErr) {
      console.warn("[Push] Web push service unavailable (native desktop alerts will still work):", pushErr);
    }
  }

  // 4. Send an immediate test notification to confirm OS desktop display
  showDesktopNotification(
    "IACMS Notifications Enabled",
    {
      body: "Desktop notifications are active. You will receive alerts when messages arrive.",
      tag: "iacms-enabled-confirmation",
    },
    () => {
      window.focus();
    }
  );

  return true;
}
