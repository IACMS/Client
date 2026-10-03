import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useNotifications } from "@/context/NotificationContext";

export default function NotificationDropdown() {
  const {
    notifications,
    unreadCount,
    isPushSupported,
    isPushGranted,
    requestPushPermission,
    sendTestNotification,
    markAsRead,
    markAllAsRead,
  } = useNotifications();

  const [isOpen, setIsOpen] = useState(false);
  const [requestingPush, setRequestingPush] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handlePointerDown(e: PointerEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen]);

  async function handleEnablePush() {
    setRequestingPush(true);
    try {
      await requestPushPermission();
    } finally {
      setRequestingPush(false);
    }
  }

  function handleNotificationClick(item: any) {
    if (!item.isRead) {
      void markAsRead(item.id);
    }
    setIsOpen(false);

    if (item.type === "CHAT_MESSAGE" || item.data?.conversationId) {
      navigate("/chat");
    } else if (item.type.startsWith("REFERRAL_") || item.data?.referralId) {
      navigate("/referrals");
    } else if (item.data?.caseId) {
      navigate(`/cases/${item.data.caseId}`);
    }
  }

  function getNotificationIcon(type: string) {
    if (type === "CHAT_MESSAGE") {
      return { icon: "chat", style: "bg-teal-100 dark:bg-teal-900/60 text-teal-600 dark:text-teal-300" };
    }
    if (type === "CASE_ASSIGNED") {
      return { icon: "assignment_ind", style: "bg-blue-100 dark:bg-blue-900/60 text-blue-600 dark:text-blue-300" };
    }
    if (type === "CASE_TRANSITIONED") {
      return { icon: "alt_route", style: "bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300" };
    }
    if (type === "REFERRAL_ACCEPTED") {
      return { icon: "check_circle", style: "bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-300" };
    }
    if (type === "REFERRAL_REJECTED") {
      return { icon: "cancel", style: "bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300" };
    }
    if (type === "REFERRAL_CREATED") {
      return { icon: "sync_alt", style: "bg-indigo-100 dark:bg-indigo-900/60 text-indigo-600 dark:text-indigo-300" };
    }
    return { icon: "notifications", style: "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300" };
  }

  function formatRelativeTime(dateString: string) {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
      if (diffSec < 60) return "Just now";
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin}m ago`;
      const diffHours = Math.floor(diffMin / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      const diffDays = Math.floor(diffHours / 24);
      if (diffDays === 1) return "Yesterday";
      if (diffDays < 7) return `${diffDays}d ago`;
      return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
    } catch {
      return "";
    }
  }

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 p-2 rounded-full cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
        aria-label="Notifications"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span className="material-symbols-outlined text-[22px]">notifications</span>

        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-teal-600 dark:bg-teal-500 rounded-full ring-2 ring-white dark:ring-slate-900 shadow-sm animate-in fade-in zoom-in duration-200">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xl overflow-hidden z-[200] animate-in fade-in slide-in-from-top-2 duration-150"
          role="region"
          aria-label="Notification list"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Notifications
              </span>
              {unreadCount > 0 && (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300">
                  {unreadCount} unread
                </span>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllAsRead()}
                className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors cursor-pointer"
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Desktop Push Banner */}
          {isPushSupported && (
            !isPushGranted ? (
              <div className="px-4 py-2.5 bg-gradient-to-r from-teal-50 to-emerald-50 dark:from-teal-950/40 dark:to-slate-800/60 border-b border-teal-100/60 dark:border-slate-800 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-[18px] text-teal-600 dark:text-teal-400 shrink-0">
                    add_alert
                  </span>
                  <span className="text-xs text-slate-700 dark:text-slate-300 leading-snug truncate">
                    Enable desktop notifications
                  </span>
                </div>
                <button
                  type="button"
                  disabled={requestingPush}
                  onClick={handleEnablePush}
                  className="px-2.5 py-1 text-xs font-medium rounded-lg bg-teal-600 text-white hover:bg-teal-700 dark:bg-teal-500 dark:hover:bg-teal-600 transition-colors shrink-0 shadow-xs cursor-pointer"
                >
                  {requestingPush ? "Enabling..." : "Enable"}
                </button>
              </div>
            ) : (
              <div className="px-4 py-2 bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
                  <span className="material-symbols-outlined text-[16px]">check_circle</span>
                  <span>Desktop alerts active</span>
                </div>
                <button
                  type="button"
                  onClick={sendTestNotification}
                  className="text-[11px] text-teal-600 dark:text-teal-400 hover:underline cursor-pointer"
                >
                  Send test alert
                </button>
              </div>
            )
          )}

          {/* Notifications Scroll Area */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400">
                  <span className="material-symbols-outlined text-2xl">notifications_none</span>
                </div>
                <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                  All caught up!
                </p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  You don&apos;t have any notifications right now.
                </p>
              </div>
            ) : (
              notifications.map((item) => {
                const { icon, style } = getNotificationIcon(item.type);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNotificationClick(item)}
                    className={`w-full text-left p-3.5 flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors cursor-pointer ${
                      !item.isRead ? "bg-teal-50/30 dark:bg-teal-950/20" : ""
                    }`}
                  >
                    {/* Icon */}
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${style}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">
                        {icon}
                      </span>
                    </div>

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span
                          className={`text-xs truncate ${
                            !item.isRead
                              ? "font-semibold text-slate-900 dark:text-slate-100"
                              : "font-medium text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          {item.title}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 shrink-0">
                          {formatRelativeTime(item.createdAt)}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {item.body}
                      </p>
                    </div>

                    {/* Unread indicator */}
                    {!item.isRead && (
                      <span className="w-2 h-2 rounded-full bg-teal-500 dark:bg-teal-400 shrink-0 mt-2" />
                    )}
                  </button>
                );
              })
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-around">
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/cases");
                }}
                className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors py-1 cursor-pointer"
              >
                Go to Cases &rarr;
              </button>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  navigate("/chat");
                }}
                className="text-xs font-medium text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 transition-colors py-1 cursor-pointer"
              >
                Go to Chat &rarr;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
