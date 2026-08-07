import { useEffect, useState } from "react";
import { apiGet, isAbortError } from "@/lib/api";
import { useSession } from "@/context/SessionContext";

type Announcement = {
  id: string;
  title: string;
  body: string;
  expiresAt: string | null;
  createdAt: string;
};

export default function AnnouncementBanner() {
  const { user } = useSession();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    // Load dismissed announcements from local storage
    try {
      const stored = localStorage.getItem("dismissed_announcements");
      if (stored) {
        setDismissed(new Set(JSON.parse(stored)));
      }
    } catch {
      // Ignore
    }

    const ac = new AbortController();
    (async () => {
      try {
        const res = (await apiGet("/api/v1/platform/announcements/active", { signal: ac.signal })) as {
          data: { announcements: Announcement[] };
        };
        if (!ac.signal.aborted) setAnnouncements(res.data.announcements || []);
      } catch (e) {
        if (!isAbortError(e)) {
          console.error("Failed to load active announcements", e);
        }
      }
    })();
    return () => ac.abort();
  }, [user]);

  const handleDismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try {
      localStorage.setItem("dismissed_announcements", JSON.stringify([...next]));
    } catch {
      // Ignore
    }
  };

  const active = announcements.filter((a) => !dismissed.has(a.id));

  if (!user || active.length === 0) return null;

  return (
    <div className="flex flex-col">
      {active.map((a) => (
        <div
          key={a.id}
          className="bg-indigo-600 text-white px-4 py-3 flex items-start sm:items-center justify-between gap-4 border-b border-indigo-700"
        >
          <div className="flex items-start sm:items-center gap-3">
            <span className="material-symbols-outlined text-indigo-200 shrink-0">campaign</span>
            <div>
              <p className="font-semibold text-sm leading-tight mb-0.5">{a.title}</p>
              <p className="text-indigo-100 text-xs leading-snug">{a.body}</p>
            </div>
          </div>
          <button
            type="button"
            className="text-indigo-200 hover:text-white transition-colors shrink-0 p-1"
            onClick={() => handleDismiss(a.id)}
            aria-label="Dismiss announcement"
          >
            <span className="material-symbols-outlined text-xl block">close</span>
          </button>
        </div>
      ))}
    </div>
  );
}
