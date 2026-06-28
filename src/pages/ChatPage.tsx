import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, apiPost, isAbortError } from "@/lib/api";
import {
  type ChatChannel,
  type ChatMessage,
  type ChatUser,
  chatUserInitials,
  chatUserLabel,
} from "@/lib/chatApi";
import { useSession } from "@/context/SessionContext";
import { useTenantApi } from "@/lib/tenantApi";
import ForbiddenView from "@/components/ForbiddenView";

type ColleaguesResponse = { colleagues?: ChatUser[] };
type MessagesResponse = { messages?: ChatMessage[]; channel?: string };

export default function ChatPage() {
  const { t } = useTranslation();
  const { user } = useSession();
  const { tenantId, get } = useTenantApi();
  const myId = user?.id ?? "";

  const [colleagues, setColleagues] = useState<ChatUser[]>([]);
  const [channel, setChannel] = useState<ChatChannel>("agency");
  const [dmUserId, setDmUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loadState, setLoadState] = useState<"loading" | "ok" | "error" | "forbidden">("loading");
  const [sendBusy, setSendBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const loadColleagues = useCallback(async () => {
    const data = (await get("/api/v1/chat/colleagues")) as ColleaguesResponse;
    setColleagues(Array.isArray(data.colleagues) ? data.colleagues : []);
  }, [get]);

  const loadMessages = useCallback(
    async (signal?: AbortSignal) => {
      if (!tenantId) return;
      const params: Record<string, string> = {
        channel,
        limit: "80",
      };
      if (channel === "dm" && dmUserId) params.withUserId = dmUserId;
      if (channel === "dm" && !dmUserId) {
        setMessages([]);
        return;
      }
      const data = (await get("/api/v1/chat/messages", params, { signal })) as MessagesResponse;
      if (signal?.aborted) return;
      setMessages(Array.isArray(data.messages) ? data.messages : []);
    },
    [tenantId, get, channel, dmUserId],
  );

  useEffect(() => {
    if (!tenantId) {
      setLoadState("error");
      setErrorMessage(t("chat.noTenant"));
      return;
    }
    const ac = new AbortController();
    (async () => {
      setLoadState("loading");
      setErrorMessage(null);
      try {
        await loadColleagues();
        await loadMessages(ac.signal);
        if (!ac.signal.aborted) setLoadState("ok");
      } catch (e) {
        if (ac.signal.aborted || isAbortError(e)) return;
        if (e instanceof ApiError && e.status === 403) {
          setLoadState("forbidden");
          setErrorMessage(e.message);
          return;
        }
        setErrorMessage(e instanceof ApiError ? e.message : t("chat.loadFailed"));
        setLoadState("error");
      }
    })();
    return () => ac.abort();
  }, [tenantId, loadColleagues, loadMessages, t]);

  useEffect(() => {
    if (loadState !== "ok") return;
    const interval = window.setInterval(() => {
      void loadMessages().catch(() => {});
    }, 5000);
    return () => window.clearInterval(interval);
  }, [loadState, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, channel, dmUserId]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sendBusy) return;
    if (channel === "dm" && !dmUserId) return;
    setSendBusy(true);
    setErrorMessage(null);
    try {
      const body: { body: string; recipientId?: string } = { body: text };
      if (channel === "dm" && dmUserId) body.recipientId = dmUserId;
      await apiPost("/api/v1/chat/messages", body);
      setDraft("");
      await loadMessages();
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : t("chat.sendFailed"));
    } finally {
      setSendBusy(false);
    }
  }

  const dmPeer = colleagues.find((c) => c.id === dmUserId);
  const channelTitle =
    channel === "agency"
      ? t("chat.teamChannelTitle", { name: user?.tenant?.name ?? t("chat.agencyFallback") })
      : dmPeer
        ? chatUserLabel(dmPeer)
        : t("chat.directMessage");

  if (loadState === "forbidden") {
    return (
      <ForbiddenView
        resourceKey="chat.forbiddenResource"
        detail={errorMessage ?? t("chat.forbiddenDetail")}
      />
    );
  }

  return (
    <div className="p-gutter max-w-7xl mx-auto w-full pb-6 h-[calc(100vh-5rem)] flex flex-col">
      <header className="mb-4 shrink-0">
        <div className="flex items-center gap-2 text-slate-500 font-label-caps text-xs mb-2">
          <span>{t("portal.breadcrumb.portal")}</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-primary font-bold">{t("portal.breadcrumb.chat")}</span>
        </div>
        <h1 className="font-h1 text-primary">{t("chat.title")}</h1>
        <p className="font-body-md text-slate-600 mt-1">
          {t("chat.subtitle", { org: user?.tenant?.name ?? t("chat.orgFallback") })}
        </p>
      </header>

      {loadState === "error" && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg border border-red-200 mb-4">{errorMessage}</div>
      )}

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[240px_1fr] bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <aside className="border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50 flex flex-col min-h-[200px] md:min-h-0">
          <div className="p-3 border-b border-slate-200">
            <p className="text-[10px] font-label-caps text-slate-500 tracking-wide mb-2">{t("chat.channels")}</p>
            <button
              type="button"
              onClick={() => {
                setChannel("agency");
                setDmUserId(null);
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 ${
                channel === "agency" ? "bg-primary text-white" : "hover:bg-slate-200 text-slate-800"
              }`}
            >
              <span className="material-symbols-outlined text-lg">groups</span>
              {t("chat.agencyChannel")}
            </button>
          </div>
          <div className="p-3 flex-1 overflow-y-auto">
            <p className="text-[10px] font-label-caps text-slate-500 tracking-wide mb-2">{t("chat.directMessages")}</p>
            <ul className="space-y-1">
              {colleagues
                .filter((c) => !c.isSelf)
                .map((c) => (
                  <li key={c.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setChannel("dm");
                        setDmUserId(c.id);
                      }}
                      className={`w-full text-left px-2 py-2 rounded-lg text-sm flex items-center gap-2 ${
                        channel === "dm" && dmUserId === c.id
                          ? "bg-teal-100 text-teal-900 font-semibold"
                          : "hover:bg-slate-200 text-slate-700"
                      }`}
                    >
                      <span className="w-8 h-8 rounded-full bg-teal-700 text-white text-xs font-bold flex items-center justify-center shrink-0">
                        {chatUserInitials(c)}
                      </span>
                      <span className="truncate">{chatUserLabel(c)}</span>
                    </button>
                  </li>
                ))}
            </ul>
          </div>
        </aside>

        <section className="flex flex-col min-h-0 min-w-0">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50 flex items-center gap-2 shrink-0">
            <span className="material-symbols-outlined text-teal-700">
              {channel === "agency" ? "forum" : "person"}
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-slate-900 truncate">{channelTitle}</p>
              <p className="text-[10px] text-slate-500">
                {channel === "agency" ? t("chat.agencyVisibility") : t("chat.dmVisibility")}
              </p>
            </div>
          </div>

          <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
            {loadState === "loading" && (
              <p className="text-center text-slate-500 text-sm py-8">{t("chat.loadingMessages")}</p>
            )}
            {loadState === "ok" && channel === "dm" && !dmUserId && (
              <p className="text-center text-slate-500 text-sm py-8">{t("chat.selectColleague")}</p>
            )}
            {loadState === "ok" && messages.length === 0 && (channel === "agency" || dmUserId) && (
              <p className="text-center text-slate-500 text-sm py-8">{t("chat.noMessages")}</p>
            )}
            {messages.map((m) => {
              const mine = m.senderId === myId;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] md:max-w-[70%] rounded-xl px-3 py-2 shadow-sm ${
                      mine ? "bg-primary text-white rounded-br-sm" : "bg-white border border-slate-200 rounded-bl-sm"
                    }`}
                  >
                    {!mine && channel === "agency" && (
                      <p className={`text-[10px] font-bold mb-0.5 ${mine ? "text-teal-100" : "text-teal-800"}`}>
                        {chatUserLabel(m.sender)}
                      </p>
                    )}
                    <p className={`text-sm whitespace-pre-wrap break-words ${mine ? "text-white" : "text-slate-800"}`}>
                      {m.body}
                    </p>
                    <p className={`text-[10px] mt-1 ${mine ? "text-teal-100" : "text-slate-400"}`}>
                      {new Date(m.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          <form onSubmit={handleSend} className="p-3 border-t border-slate-200 bg-white shrink-0">
            {errorMessage && loadState === "ok" && (
              <p className="text-xs text-red-700 mb-2">{errorMessage}</p>
            )}
            <div className="flex gap-2">
              <textarea
                rows={2}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                disabled={sendBusy || (channel === "dm" && !dmUserId)}
                placeholder={
                  channel === "agency"
                    ? t("chat.placeholder.agency")
                    : dmUserId
                      ? t("chat.placeholder.dm", { name: chatUserLabel(dmPeer) })
                      : t("chat.placeholder.selectFirst")
                }
                className="flex-1 border border-slate-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:bg-slate-50"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void handleSend(e as unknown as FormEvent);
                  }
                }}
              />
              <button
                type="submit"
                disabled={sendBusy || !draft.trim() || (channel === "dm" && !dmUserId)}
                className="self-end px-4 py-2.5 bg-primary text-white rounded-lg font-semibold text-sm hover:bg-primary-container disabled:opacity-50 flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-lg">send</span>
                {t("chat.send")}
              </button>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">{t("chat.sendHint")}</p>
          </form>
        </section>
      </div>
    </div>
  );
}
