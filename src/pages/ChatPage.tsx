import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, apiPost, isAbortError } from "@/lib/api";
import {
  type ChatConversation,
  type ChatMessage,
  type ChatUser,
  chatUserInitials,
  chatUserLabel,
  ChatWebSocketClient
} from "@/lib/chatApi";
import { useSession } from "@/context/SessionContext";
import { useTenantApi } from "@/lib/tenantApi";
import ForbiddenView from "@/components/ForbiddenView";

export default function ChatPage() {
  const { t } = useTranslation();
  const { user } = useSession();
  const { tenantId, get } = useTenantApi();
  const myId = user?.id ?? "";

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [colleagues, setColleagues] = useState<ChatUser[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [loadState, setLoadState] = useState<"loading" | "ok" | "error" | "forbidden">("loading");
  const [sendBusy, setSendBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  
  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const wsClientRef = useRef<ChatWebSocketClient | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      if (!draft) {
        textareaRef.current.style.height = '';
      } else {
        textareaRef.current.style.height = 'auto';
        textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 140) + 'px';
      }
    }
  }, [draft]);
  const activeConversationIdRef = useRef<string | null>(activeConversationId);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
    (window as any).__iacmsActiveConversationId = activeConversationId;
    return () => {
      (window as any).__iacmsActiveConversationId = null;
    };
  }, [activeConversationId]);

  const loadConversations = useCallback(async () => {
    try {
      const data = (await get("/api/v1/chat/conversations")) as any;
      setConversations(Array.isArray(data.conversations) ? data.conversations : []);
    } catch (e) {
      console.error("Failed to load conversations:", e);
    }
  }, [get]);

  const loadColleagues = useCallback(async () => {
    try {
      // Fallback colleagues fetch using auth users
      const data = (await get("/api/v1/auth/users")) as any;
      const list = Array.isArray(data.users) ? data.users : [];
      setColleagues(list.filter((c: any) => c.id !== myId && c.isActive));
    } catch (e) {
      console.error("Failed to load colleagues:", e);
    }
  }, [get, myId]);

  const loadMessages = useCallback(
    async (convId: string, signal?: AbortSignal) => {
      try {
        const data = (await get(`/api/v1/chat/conversations/${convId}/messages`, { limit: "80" }, { signal })) as any;
        if (signal?.aborted) return;
        
        // Reverse because the backend returns newest first
        const msgs = Array.isArray(data.messages) ? data.messages : [];
        setMessages([...msgs].reverse());
      } catch (e) {
        if (!isAbortError(e)) {
          console.error("Failed to load messages:", e);
        }
      }
    },
    [get]
  );

  // Initial load
  useEffect(() => {
    if (!tenantId) {
      setLoadState("error");
      setErrorMessage(t("chat.noTenant"));
      return;
    }
    
    setLoadState("loading");
    setErrorMessage(null);
    
    Promise.all([loadConversations(), loadColleagues()]).then(() => {
      setLoadState("ok");
    }).catch(e => {
      if (e instanceof ApiError && e.status === 403) {
        setLoadState("forbidden");
        setErrorMessage(e.message);
      } else {
        setLoadState("error");
        setErrorMessage(e instanceof ApiError ? e.message : t("chat.loadFailed"));
      }
    });
  }, [tenantId, loadConversations, loadColleagues, t]);

  // Fetch presence
  useEffect(() => {
    if (loadState !== "ok") return;
    
    const fetchPresence = () => {
      const userIds = new Set<string>();
      conversations.forEach(c => c.participants.forEach(p => p.userId && p.userId !== myId && userIds.add(p.userId)));
      colleagues.forEach(c => c.id !== myId && userIds.add(c.id));
      
      if (userIds.size > 0) {
        apiPost("/api/v1/chat/presence", { userIds: Array.from(userIds) })
          .then((res: any) => {
            if (res?.presence) {
              const onlineIds = Object.keys(res.presence).filter(id => res.presence[id]);
              setOnlineUsers(new Set(onlineIds));
            }
          })
          .catch(() => {});
      }
    };

    fetchPresence();
    const interval = setInterval(fetchPresence, 15000);
    return () => clearInterval(interval);
  }, [loadState, conversations, colleagues, myId]);

  // WebSocket Connection
  useEffect(() => {
    if (loadState !== "ok") return;

    const token = localStorage.getItem("iacms.accessToken");
    if (!token) return;

    const ws = new ChatWebSocketClient(token);
    ws.connect();
    wsClientRef.current = ws;

    const cleanup = ws.onMessage((msg) => {
      if (msg.type === "MESSAGE_CREATED" || msg.type === "CONVERSATION_ACTIVITY") {
        const newMsg = (msg.data?.message || msg.data) as ChatMessage;
        const convId = msg.data?.conversationId || newMsg.conversationId;
        
        const currentActiveId = activeConversationIdRef.current;
        // Update messages if it belongs to currently active conversation
        if (convId === currentActiveId && newMsg?.id) {
          setMessages((prev) => {
            // If replacing an optimistic message (matching clientMessageId)
            const existingIdx = prev.findIndex(m => 
              (newMsg.clientMessageId && m.clientMessageId === newMsg.clientMessageId) || m.id === newMsg.id
            );
            if (existingIdx !== -1) {
              const updated = [...prev];
              updated[existingIdx] = newMsg;
              return updated;
            }
            return [...prev, newMsg];
          });
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }

        // Live update conversation item in list and bump to top
        setConversations((prev) => {
          const exists = prev.some(c => c.id === convId);
          if (!exists) {
            loadConversations();
            return prev;
          }
          return prev.map(c => {
            if (c.id === convId) {
              return {
                ...c,
                lastMessageId: newMsg.id,
                lastMessageAt: newMsg.createdAt,
                unreadCount: convId === currentActiveId ? 0 : (c.unreadCount || 0) + 1,
              };
            }
            return c;
          }).sort((a, b) => {
            const timeA = a.lastMessageAt ? new Date(a.lastMessageAt).getTime() : 0;
            const timeB = b.lastMessageAt ? new Date(b.lastMessageAt).getTime() : 0;
            return timeB - timeA;
          });
        });
      }

      if (msg.type === "CONVERSATION_CREATED") {
        loadConversations();
      }

      if (msg.type === "PRESENCE_CHANGE") {
        console.log("WebSocket PRESENCE_CHANGE:", msg.data);
        const { userId, isOnline } = msg.data || {};
        if (userId) {
          setOnlineUsers(prev => {
            const next = new Set(prev);
            if (isOnline) next.add(userId);
            else next.delete(userId);
            return next;
          });
        }
      }
    });

    return () => {
      cleanup();
      ws.disconnect();
    };
  }, [loadState, loadConversations]);

  // When active conversation changes
  useEffect(() => {
    // Notify server of active focus for notifications
    wsClientRef.current?.sendFocus(activeConversationId);

    if (!activeConversationId) {
      setMessages([]);
      return;
    }

    // Mark as read on backend and clear local unread count
    const activeConv = conversations.find(c => c.id === activeConversationId);
    if (activeConv?.lastMessageId) {
      apiPost(`/api/v1/chat/conversations/${activeConversationId}/messages/read`, { messageId: activeConv.lastMessageId }).catch(() => {});
    }
    setConversations(prev => prev.map(c => c.id === activeConversationId ? { ...c, unreadCount: 0 } : c));

    const ac = new AbortController();
    loadMessages(activeConversationId, ac.signal).then(() => {
      bottomRef.current?.scrollIntoView({ behavior: "auto" });
    });

    // Subscribe via WS
    wsClientRef.current?.subscribeToConversation(activeConversationId);

    return () => {
      ac.abort();
      wsClientRef.current?.unsubscribeFromConversation(activeConversationId);
    };
  }, [activeConversationId, loadMessages]);

  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || sendBusy || !activeConversationId) return;
    
    setSendBusy(true);
    setErrorMessage(null);
    
    // Optimistic UI update
    const clientMessageId = crypto.randomUUID();
    const tempMsg: ChatMessage = {
      id: "temp-" + clientMessageId,
      conversationId: activeConversationId,
      senderId: myId,
      clientMessageId,
      messageType: 'TEXT',
      content: text,
      createdAt: new Date().toISOString(),
      sender: user as unknown as ChatUser,
    };
    
    setMessages(prev => [...prev, tempMsg]);
    setDraft("");
    if (textareaRef.current) {
      textareaRef.current.style.height = '';
    }
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      await apiPost(`/api/v1/chat/conversations/${activeConversationId}/messages`, { 
        content: text,
        clientMessageId
      });
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : t("chat.sendFailed"));
      setMessages(prev => prev.filter(m => m.clientMessageId !== clientMessageId));
      setDraft(text);
    } finally {
      setSendBusy(false);
    }
  }

  async function startDirectMessage(colleagueId: string) {
    try {
      const data = await apiPost("/api/v1/chat/conversations", {
        type: "DIRECT",
        participantId: colleagueId
      });
      await loadConversations();
      setActiveConversationId((data as any).id);
    } catch (e) {
      console.error(e);
      setErrorMessage("Failed to start conversation");
    }
  }

  // Helpers
  const getOtherParticipant = (conv: ChatConversation): ChatUser | null => {
    if (conv.type !== "DIRECT") return null;
    const other = conv.participants.find(p => p.userId !== myId);
    if (!other) return null;
    return {
      ...(other.user || {}),
      id: other.userId || other.user?.id,
    } as ChatUser;
  };

  const getConversationTitle = (conv: ChatConversation): string => {
    if (conv.type === "GROUP") return conv.title || "Group Chat";
    const other = getOtherParticipant(conv);
    return other ? chatUserLabel(other) : "Direct Message";
  };

  const activeConversation = conversations.find(c => c.id === activeConversationId);
  const channelTitle = activeConversation ? getConversationTitle(activeConversation) : "Select a conversation";

  if (loadState === "forbidden") {
    return (
      <ForbiddenView
        resourceKey="chat.forbiddenResource"
        detail={errorMessage ?? t("chat.forbiddenDetail")}
      />
    );
  }

  // Show only colleagues who don't already have an active conversation
  const colleaguesWithoutChat = colleagues.filter(c => {
    return !conversations.some(conv => 
      conv.type === "DIRECT" && conv.participants.some(p => p.userId === c.id)
    );
  });

  return (
    <div className="max-w-7xl mx-auto w-full h-[calc(100vh-5rem)] flex flex-col font-sans bg-slate-50 p-4 md:p-6">
      <header className="mb-4 shrink-0">
        <div className="flex items-center gap-2 text-slate-500 font-label-caps text-xs mb-1">
          <span>{t("portal.breadcrumb.portal")}</span>
          <span className="material-symbols-outlined text-xs">chevron_right</span>
          <span className="text-teal-700 font-bold">{t("portal.breadcrumb.chat")}</span>
        </div>
        <h1 className="font-h1 text-teal-800">{t("chat.title")}</h1>
        <p className="font-body-md text-slate-600 mt-1">
          {t("chat.subtitle", { org: user?.tenant?.name ?? t("chat.orgFallback") })}
        </p>
      </header>

      {loadState === "error" && (
        <div className="bg-red-50 text-red-700 p-3 rounded border border-red-200 mb-4">{errorMessage}</div>
      )}

      {/* Main Telegram-style Layout */}
      <div className="flex-1 min-h-0 flex bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
        
        {/* Left Sidebar (Conversations) */}
        <aside className={`w-full md:w-[320px] flex-shrink-0 border-r border-slate-200 bg-white flex flex-col ${activeConversationId ? "hidden md:flex" : "flex"}`}>
          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
            <div className="p-3">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Chats</p>
              <ul className="space-y-0.5">
                {conversations.length === 0 && (
                   <p className="text-sm text-slate-400 p-2 text-center">No active conversations</p>
                )}
                {conversations.map((c) => {
                  const isActive = activeConversationId === c.id;
                  const title = getConversationTitle(c);
                  const otherUser = getOtherParticipant(c);
                  
                  return (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => setActiveConversationId(c.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-md flex items-center gap-3 ${
                          isActive
                            ? "bg-teal-600 text-white"
                            : "hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                          isActive ? "bg-white text-teal-700" : "bg-teal-700 text-white"
                        }`}>
                          {c.type === "GROUP" ? "G" : chatUserInitials(otherUser)}
                          {c.type !== "GROUP" && otherUser && (
                            <span
                              className={`absolute bottom-0 right-0 w-[11px] h-[11px] rounded-full border-2 ${
                                isActive ? "border-teal-700" : "border-white"
                              } ${onlineUsers.has(otherUser.id) ? "bg-green-500" : "bg-white border-slate-300"}`}
                              title={onlineUsers.has(otherUser.id) ? "Online" : "Offline"}
                            />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1 mb-0.5">
                            <p className={`text-sm font-semibold truncate ${isActive ? "text-white" : "text-slate-900"}`}>
                              {title}
                            </p>
                            {c.lastMessageAt && (
                              <span className={`text-[10px] shrink-0 font-normal ${isActive ? "text-teal-100" : "text-slate-400"}`}>
                                {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <p className={`text-xs truncate ${isActive ? "text-teal-100" : "text-slate-500"}`}>
                              {c.type === "GROUP" ? "Group channel" : (otherUser ? (otherUser.email || otherUser.username || "Direct message") : "Direct message")}
                            </p>
                            {!isActive && c.unreadCount && c.unreadCount > 0 ? (
                              <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-teal-600 text-white shrink-0 shadow-xs leading-none">
                                {c.unreadCount}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>

            {/* Colleagues Section */}
            {colleaguesWithoutChat.length > 0 && (
              <div className="p-3 border-t border-slate-100 mt-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Start a new chat</p>
                <ul className="space-y-0.5">
                  {colleaguesWithoutChat.map((c) => (
                    <li key={c.id}>
                      <button
                        type="button"
                        onClick={() => startDirectMessage(c.id)}
                        className="w-full text-left px-3 py-2.5 rounded-md flex items-center gap-3 hover:bg-slate-100 text-slate-700 group"
                      >
                        <div className="relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 bg-slate-100 text-slate-500 group-hover:bg-teal-100 group-hover:text-teal-700 transition-colors">
                          {chatUserInitials(c)}
                          <span
                            className={`absolute bottom-0 right-0 w-[11px] h-[11px] rounded-full border-2 border-white ${
                              onlineUsers.has(c.id) ? "bg-green-500" : "bg-white border-slate-300"
                            }`}
                            title={onlineUsers.has(c.id) ? "Online" : "Offline"}
                          />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate text-slate-900 group-hover:text-teal-700 transition-colors">
                            {chatUserLabel(c)}
                          </p>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </aside>

        {/* Chat Area */}
        <section className={`flex-1 flex flex-col min-w-0 bg-slate-100 relative ${!activeConversationId ? "hidden md:flex" : "flex"}`}>
          {/* Header */}
          <div className="px-5 py-3 border-b border-slate-200 bg-white flex items-center gap-3 shrink-0 z-10 shadow-sm h-[65px]">
            {activeConversationId ? (
              <>
                <button
                  type="button"
                  onClick={() => setActiveConversationId(null)}
                  className="md:hidden p-1.5 -ml-2 mr-1 rounded-full text-slate-600 hover:bg-slate-100 transition-colors shrink-0"
                  title="Back to conversations"
                >
                  <span className="material-symbols-outlined text-[20px] block">arrow_back</span>
                </button>
                <div className="relative w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[20px]">
                    {activeConversation?.type === "GROUP" ? "forum" : "person"}
                  </span>
                  {activeConversation?.type !== "GROUP" && activeConversation && getOtherParticipant(activeConversation) && (
                    <span
                      className={`absolute bottom-0 right-0 w-[11px] h-[11px] rounded-full border-2 border-white ${
                        onlineUsers.has(getOtherParticipant(activeConversation)!.id) ? "bg-green-500" : "bg-white border-slate-300"
                      }`}
                      title={onlineUsers.has(getOtherParticipant(activeConversation)!.id) ? "Online" : "Offline"}
                    />
                  )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-slate-900 text-[15px] leading-snug truncate">{channelTitle}</h2>
                  {activeConversation?.type !== "GROUP" && activeConversation && getOtherParticipant(activeConversation) && (
                    <p className={`text-[12px] leading-none mt-0.5 ${
                      onlineUsers.has(getOtherParticipant(activeConversation)!.id) ? "text-teal-600 font-medium" : "text-slate-400"
                    }`}>
                      {onlineUsers.has(getOtherParticipant(activeConversation)!.id) ? "online" : "offline"}
                    </p>
                  )}
                </div>
              </>
            ) : (
              <div className="min-w-0">
                <h2 className="font-semibold text-slate-400 text-[15px] leading-snug truncate">No chat selected</h2>
              </div>
            )}
          </div>

          {/* Messages List (Telegram style background) */}
          <div ref={listRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#e6ebeb] custom-scrollbar">
            {loadState === "loading" && (
              <div className="flex justify-center py-6">
                <span className="material-symbols-outlined text-slate-400 animate-spin">sync</span>
              </div>
            )}
            
            {loadState === "ok" && !activeConversationId && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-200 mb-2">
                  <p className="text-slate-600 font-medium">Select a colleague from the sidebar to start a new conversation.</p>
                </div>
              </div>
            )}
            
            {loadState === "ok" && activeConversationId && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <div className="bg-white px-5 py-3 rounded-2xl shadow-sm border border-slate-200">
                  <p className="text-slate-600 font-medium">No messages yet. Send a message to start!</p>
                </div>
              </div>
            )}

            {messages.map((m, index) => {
              const mine = m.senderId === myId;
              const showAvatar = !mine && (index === 0 || messages[index - 1].senderId !== m.senderId);
              
              const mDate = new Date(m.createdAt);
              const dateKey = mDate.toLocaleDateString();
              const prevDateKey = index > 0 ? new Date(messages[index - 1].createdAt).toLocaleDateString() : null;
              const showDateDivider = dateKey !== prevDateKey;
              
              const isContinuation = index > 0 && messages[index - 1].senderId === m.senderId && !showDateDivider;
              
              return (
                <div key={m.id}>
                  {showDateDivider && (
                    <div className="flex justify-center my-4">
                      <span className="bg-[#cbd5e1]/50 text-slate-600 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
                        {mDate.toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                      </span>
                    </div>
                  )}
                  
                  <div className={`flex ${mine ? "justify-end" : "justify-start"} ${isContinuation ? "mt-0.5" : "mt-2"}`}>
                    {!mine && activeConversation?.type === "GROUP" && (
                      <div className="w-9 shrink-0 flex flex-col justify-end pb-1 pr-1">
                        {showAvatar && (
                          <div className="w-8 h-8 rounded-full bg-teal-700 text-white flex items-center justify-center text-[10px] font-bold">
                            {chatUserInitials(m.sender)}
                          </div>
                        )}
                      </div>
                    )}

                    <div className={`relative max-w-[75%] px-3 py-1.5 shadow-sm flex flex-col ${
                      mine 
                        ? "bg-[#e3fec5] rounded-l-2xl rounded-tr-2xl rounded-br-sm" 
                        : "bg-white rounded-r-2xl rounded-tl-2xl rounded-bl-sm"
                    }`}>
                      {!mine && activeConversation?.type === "GROUP" && showAvatar && (
                        <span className="text-[12px] font-bold text-teal-700 leading-tight mb-0.5">
                          {chatUserLabel(m.sender)}
                        </span>
                      )}
                      
                      <div className="flex items-end gap-2 flex-wrap">
                        <p className="text-[14px] text-slate-900 leading-relaxed whitespace-pre-wrap break-words min-w-0">
                          {m.content}
                          <span className="inline-block w-12 h-0"></span>
                        </p>
                        
                        <div className="float-right -mr-1 -mb-0.5 flex items-center gap-0.5">
                          <span className={`text-[10px] font-medium ${mine ? "text-teal-700/70" : "text-slate-400"}`}>
                            {mDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {mine && (
                            <span className="material-symbols-outlined text-[14px] text-teal-600">done_all</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} className="h-2" />
          </div>

          {/* Telegram-style Input Area matching screenshot layout */}
          <form onSubmit={handleSend} className="px-3 py-1.5 bg-white shrink-0 z-10 flex flex-col border-t border-slate-200">
            {errorMessage && loadState === "ok" && (
              <div className="text-xs text-red-600 mb-1.5 px-1">{errorMessage}</div>
            )}
            <div className="flex items-end gap-1">
              {/* Attachment Icon */}
              <button
                type="button"
                disabled={!activeConversationId}
                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-teal-600 disabled:opacity-40 transition-colors shrink-0 rounded-full hover:bg-slate-100"
                title="Attach file"
              >
                <span className="material-symbols-outlined text-[24px]">attach_file</span>
              </button>
              
              {/* Textarea Area */}
              <div className="flex-1 flex items-center min-w-0">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  disabled={sendBusy || !activeConversationId}
                  placeholder={!activeConversationId ? "Select a conversation to send a message..." : "Write a message..."}
                  className="w-full bg-transparent py-2 px-2 text-[15px] text-slate-900 placeholder:text-slate-400 resize-none border-0 border-none outline-none ring-0 focus:border-0 focus:border-none focus:outline-none focus:ring-0 focus:ring-transparent shadow-none focus:shadow-none disabled:opacity-50 min-h-[40px] max-h-[140px] leading-relaxed custom-scrollbar"
                  style={{ border: 'none', outline: 'none', boxShadow: 'none' }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void handleSend(e as unknown as FormEvent);
                    }
                  }}
                />
              </div>

              {/* Emoji / Smile Button */}
              <button
                type="button"
                disabled={!activeConversationId}
                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-teal-600 disabled:opacity-40 transition-colors shrink-0 rounded-full hover:bg-slate-100"
                title="Emoji"
              >
                <span className="material-symbols-outlined text-[24px]">sentiment_satisfied</span>
              </button>
              
              {/* Mic / Send Button */}
              {draft.trim() ? (
                <button
                  type="submit"
                  disabled={sendBusy}
                  className="w-10 h-10 rounded-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center transition-all shrink-0 shadow-sm"
                  title="Send"
                >
                  <span className="material-symbols-outlined text-[20px] ml-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>send</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={!activeConversationId}
                  className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-teal-600 disabled:opacity-40 transition-colors shrink-0 rounded-full hover:bg-slate-100"
                  title="Voice message"
                >
                  <span className="material-symbols-outlined text-[24px]">mic</span>
                </button>
              )}
            </div>
          </form>
        </section>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background-color: rgba(203, 213, 225, 0.8);
          border-radius: 20px;
        }
      `}</style>
    </div>
  );
}
