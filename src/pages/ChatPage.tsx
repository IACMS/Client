import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, apiPost, isAbortError } from "@/lib/api";
import {
  type ChatConversation,
  type ChatMessage,
  type ChatReaction,
  type ChatUser,
  type ChatAttachment,
  chatUserInitials,
  chatUserLabel,
  ChatWebSocketClient,
  addMessageReaction,
  removeMessageReaction,
  updateMessage,
  deleteMessage,
} from "@/lib/chatApi";
import { downloadFile, viewFileBlob, uploadFileAuto } from "@/lib/filesApi";
import { useSession } from "@/context/SessionContext";
import { useTenantApi } from "@/lib/tenantApi";
import ForbiddenView from "@/components/ForbiddenView";

const QUICK_EMOJIS = ["👍", "❤️", "🔥", "😂", "🎉", "🙏"];

type StagedAttachment = {
  file: File;
  previewUrl?: string;
  isImage: boolean;
  fileId?: string;
  uploading: boolean;
  progress: number;
  error?: string | null;
  abortController?: AbortController;
};

type LightboxMedia = {
  src: string;
  title: string;
  fileId?: string;
};

/** Inline preview for image attachments with authenticated blob fetching and auto-retry */
function ChatImageAttachment({
  fileId,
  fileName,
  onOpenLightbox,
}: {
  fileId: string;
  fileName: string;
  onOpenLightbox: (src: string, title: string) => void;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [retryKey, setRetryKey] = useState(0);

  useEffect(() => {
    let active = true;
    let objUrl: string | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let attempts = 0;

    const fetchImage = () => {
      viewFileBlob(fileId)
        .then((blob) => {
          if (!active) return;
          objUrl = URL.createObjectURL(blob);
          setSrc(objUrl);
          setLoading(false);
          setError(false);
        })
        .catch((err) => {
          if (!active) return;
          attempts++;
          if (attempts < 8) {
            retryTimer = setTimeout(fetchImage, 1500);
          } else {
            console.warn("Failed to load image attachment", err);
            setError(true);
            setLoading(false);
          }
        });
    };

    fetchImage();

    return () => {
      active = false;
      if (retryTimer) clearTimeout(retryTimer);
      if (objUrl) URL.revokeObjectURL(objUrl);
    };
  }, [fileId, retryKey]);

  if (loading) {
    return (
      <div className="w-56 h-36 rounded-xl bg-slate-200/80 animate-pulse flex flex-col items-center justify-center text-slate-400 gap-1.5 my-1">
        <span className="material-symbols-outlined text-2xl animate-spin text-teal-600">progress_activity</span>
        <span className="text-[11px] font-medium text-slate-500">Loading photo...</span>
      </div>
    );
  }

  if (error || !src) {
    return (
      <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs my-1 max-w-xs">
        <span className="material-symbols-outlined text-[18px] text-amber-600 shrink-0">broken_image</span>
        <span className="truncate font-medium flex-1">{fileName}</span>
        <button
          type="button"
          onClick={() => {
            setError(false);
            setLoading(true);
            setRetryKey((k) => k + 1);
          }}
          className="text-xs text-amber-700 hover:text-amber-900 underline font-medium cursor-pointer"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div
      className="relative group/img overflow-hidden rounded-xl border border-black/10 my-1 max-w-xs cursor-pointer shadow-xs bg-black/5"
      onClick={() => onOpenLightbox(src, fileName)}
      title="Click to enlarge"
    >
      <img
        src={src}
        alt={fileName}
        className="max-h-64 w-auto max-w-full rounded-xl object-contain mx-auto group-hover/img:scale-[1.02] transition-transform duration-200"
      />
      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center gap-2 text-white">
        <span className="material-symbols-outlined text-2xl drop-shadow">zoom_in</span>
      </div>
    </div>
  );
}

/** Document attachment card with custom badge and direct download */
function ChatDocumentAttachment({
  fileId,
  fileName,
  sizeBytes,
}: {
  fileId: string;
  fileName: string;
  sizeBytes?: number;
}) {
  const [downloading, setDownloading] = useState(false);

  const getFileBadge = (name: string) => {
    const ext = name.split(".").pop()?.toLowerCase();
    if (ext === "pdf") return { icon: "picture_as_pdf", bg: "bg-red-500" };
    if (["doc", "docx"].includes(ext || "")) return { icon: "description", bg: "bg-blue-600" };
    if (["xls", "xlsx", "csv"].includes(ext || "")) return { icon: "table_view", bg: "bg-emerald-600" };
    if (["zip", "rar", "tar", "gz", "7z"].includes(ext || "")) return { icon: "folder_zip", bg: "bg-amber-600" };
    return { icon: "draft", bg: "bg-slate-600" };
  };

  const badge = getFileBadge(fileName);

  const formatSize = (bytes?: number) => {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const handleDownload = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadFile(fileId, fileName);
    } catch (err: any) {
      console.error("Download failed", err);
      alert(`Download error: ${err?.message || "File could not be downloaded"}`);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div
      onClick={handleDownload}
      className="flex items-center gap-3 p-2.5 my-1 rounded-xl bg-black/5 hover:bg-black/10 border border-black/5 transition-all cursor-pointer select-none max-w-sm"
      title="Click to download"
    >
      <div className={`w-10 h-10 rounded-lg ${badge.bg} text-white flex items-center justify-center shrink-0 shadow-xs`}>
        <span className="material-symbols-outlined text-[22px]">{badge.icon}</span>
      </div>
      <div className="flex-1 min-w-0 pr-1">
        <p className="text-[13px] font-semibold text-slate-800 truncate leading-snug">{fileName}</p>
        <p className="text-[11px] text-slate-500 font-medium">{formatSize(sizeBytes)}</p>
      </div>
      <button
        type="button"
        disabled={downloading}
        className="w-8 h-8 rounded-full flex items-center justify-center text-slate-600 hover:text-teal-700 hover:bg-white/80 transition-colors shrink-0"
        title="Download file"
      >
        <span className={`material-symbols-outlined text-[20px] ${downloading ? "animate-spin" : ""}`}>
          {downloading ? "progress_activity" : "download"}
        </span>
      </button>
    </div>
  );
}

export default function ChatPage() {
  const { t } = useTranslation();
  const { user } = useSession();
  const { get } = useTenantApi();
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

  // ── Phase 2.1 State: Typing, Replies, Reactions, Edit, Delete ────────────
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [activeReactionPickerMessageId, setActiveReactionPickerMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // ── Phase 2.2 State: File Attachments & Lightbox ───────────────────────────
  const [stagedAttachment, setStagedAttachment] = useState<StagedAttachment | null>(null);
  const [lightboxMedia, setLightboxMedia] = useState<LightboxMedia | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const wsClientRef = useRef<ChatWebSocketClient | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isTypingRef = useRef<boolean>(false);
  const typingTimeoutRef = useRef<any>(null);
  const activeConversationIdRef = useRef<string | null>(activeConversationId);

  useEffect(() => {
    activeConversationIdRef.current = activeConversationId;
  }, [activeConversationId]);

  // Close lightbox on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && lightboxMedia) {
        setLightboxMedia(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [lightboxMedia]);

  // ── WebSocket & Realtime Events ──────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("iacms.accessToken") || "";
    const wsClient = new ChatWebSocketClient(token);
    wsClient.connect();
    wsClientRef.current = wsClient;

    const unsubscribe = wsClient.onMessage((evt: any) => {
      if (!evt || !evt.type) return;

      if (evt.type === "PRESENCE_UPDATE") {
        const { userId, status } = evt.data || {};
        if (userId) {
          setOnlineUsers((prev) => {
            const next = new Set(prev);
            if (status === "ONLINE") next.add(userId);
            else next.delete(userId);
            return next;
          });
        }
        return;
      }

      // Typing indicators
      if (evt.type === "TYPING_START") {
        const { conversationId, userId, userName } = evt.data || {};
        if (conversationId === activeConversationIdRef.current && userId !== myId) {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.set(userId, userName || "Colleague");
            return next;
          });
        }
        return;
      }

      if (evt.type === "TYPING_STOP") {
        const { conversationId, userId } = evt.data || {};
        if (conversationId === activeConversationIdRef.current) {
          setTypingUsers((prev) => {
            const next = new Map(prev);
            next.delete(userId);
            return next;
          });
        }
        return;
      }

      // Message Created
      if (evt.type === "MESSAGE_CREATED") {
        const newMsg: ChatMessage = evt.data;
        if (!newMsg || !newMsg.conversationId) return;

        setConversations((prev) =>
          prev.map((c) => {
            if (c.id === newMsg.conversationId) {
              const isCurrentActive = c.id === activeConversationIdRef.current;
              return {
                ...c,
                lastMessageId: newMsg.id,
                lastMessageAt: newMsg.createdAt,
                unreadCount: isCurrentActive ? 0 : (c.unreadCount || 0) + 1,
              };
            }
            return c;
          })
        );

        if (newMsg.conversationId === activeConversationIdRef.current) {
          setMessages((prev) => {
            const exists = prev.some(
              (m) =>
                (newMsg.clientMessageId && m.clientMessageId === newMsg.clientMessageId) ||
                m.id === newMsg.id
            );
            if (exists) {
              return prev.map((m) =>
                (newMsg.clientMessageId && m.clientMessageId === newMsg.clientMessageId) ||
                m.id === newMsg.id
                  ? newMsg
                  : m
              );
            }
            return [...prev, newMsg];
          });

          // Clear typing indicator for sender
          if (newMsg.senderId) {
            setTypingUsers((prev) => {
              const next = new Map(prev);
              next.delete(newMsg.senderId);
              return next;
            });
          }

          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

          if (newMsg.senderId !== myId) {
            void markActiveConversationRead(newMsg.conversationId, newMsg.id);
          }
        }
        return;
      }

      // Message Updated (Edit)
      if (evt.type === "MESSAGE_UPDATED") {
        const { id, content, editedAt } = evt.data || {};
        if (id) {
          setMessages((prev) =>
            prev.map((m) => (m.id === id ? { ...m, content, editedAt } : m))
          );
        }
        return;
      }

      // Message Deleted
      if (evt.type === "MESSAGE_DELETED") {
        const { messageId } = evt.data || {};
        if (messageId) {
          setMessages((prev) => prev.filter((m) => m.id !== messageId));
        }
        return;
      }

      // Reactions
      if (evt.type === "REACTION_ADDED") {
        const { messageId, userId, emoji } = evt.data || {};
        if (messageId && userId && emoji) {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== messageId) return m;
              const current = m.reactions || [];
              const already = current.some((r) => r.userId === userId && r.emoji === emoji);
              if (already) return m;
              return { ...m, reactions: [...current, { userId, emoji }] };
            })
          );
        }
        return;
      }

      if (evt.type === "REACTION_REMOVED") {
        const { messageId, userId, emoji } = evt.data || {};
        if (messageId && userId && emoji) {
          setMessages((prev) =>
            prev.map((m) => {
              if (m.id !== messageId) return m;
              const current = m.reactions || [];
              return {
                ...m,
                reactions: current.filter((r) => !(r.userId === userId && r.emoji === emoji)),
              };
            })
          );
        }
        return;
      }

      // Read Receipts
      if (evt.type === "READ_RECEIPT") {
        const { conversationId, userId, lastReadMessageId } = evt.data || {};
        if (conversationId && userId) {
          setConversations((prev) =>
            prev.map((c) => {
              if (c.id !== conversationId) return c;
              return {
                ...c,
                participants: c.participants.map((p) =>
                  p.userId === userId
                    ? {
                        ...p,
                        lastReadMessageId: lastReadMessageId || p.lastReadMessageId,
                        lastReadAt: new Date().toISOString(),
                      }
                    : p
                ),
              };
            })
          );
        }
        return;
      }

      // New Conversation Created
      if (evt.type === "CONVERSATION_CREATED") {
        const newConv: ChatConversation = evt.data;
        if (newConv && newConv.id) {
          setConversations((prev) => {
            if (prev.some((c) => c.id === newConv.id)) return prev;
            return [newConv, ...prev];
          });
        }
        return;
      }
    });

    return () => {
      unsubscribe();
      wsClient.disconnect();
      wsClientRef.current = null;
    };
  }, [myId]);

  // Subscribe/Unsubscribe WS to active conversation
  useEffect(() => {
    if (!wsClientRef.current) return;
    if (activeConversationId) {
      wsClientRef.current.subscribeToConversation(activeConversationId);
      wsClientRef.current.sendFocus(activeConversationId);
    } else {
      wsClientRef.current.sendFocus(null);
    }

    setTypingUsers(new Map());
    setReplyingTo(null);
    setEditingMessageId(null);
    setActiveReactionPickerMessageId(null);
  }, [activeConversationId]);

  // Load Initial Data (Conversations + Colleagues)
  const loadConversations = useCallback(async () => {
    try {
      const res = (await get("/api/v1/chat/conversations")) as { conversations: ChatConversation[] };
      setConversations(res.conversations || []);
    } catch (err: unknown) {
      if (isAbortError(err)) return;
      if (err instanceof ApiError && err.status === 403) {
        setLoadState("forbidden");
        setErrorMessage(err.message || t("chat.forbiddenDetail"));
        return;
      }
      setErrorMessage(err instanceof ApiError ? err.message : t("chat.loadFailed"));
    }
  }, [get, t]);

  const loadColleagues = useCallback(async () => {
    try {
      const res = (await get("/api/v1/auth/users")) as { users: ChatUser[] } | ChatUser[];
      const list = Array.isArray(res) ? res : res.users || [];
      const others = list.filter((u: ChatUser) => u.id !== myId);
      setColleagues(others);

      const userIds = new Set<string>();
      others.forEach((u: ChatUser) => userIds.add(u.id));
      conversations.forEach((c) =>
        c.participants.forEach((p) => {
          if (p.userId !== myId) userIds.add(p.userId);
        })
      );

      if (userIds.size > 0) {
        try {
          const presRes = (await apiPost("/api/v1/chat/presence", {
            userIds: Array.from(userIds),
          })) as { presence: Record<string, string> };
          if (presRes?.presence) {
            const online = new Set<string>();
            Object.entries(presRes.presence).forEach(([uId, status]) => {
              if (status === "ONLINE") online.add(uId);
            });
            setOnlineUsers(online);
          }
        } catch {
          /* ignore presence check error */
        }
      }
    } catch (err) {
      if (isAbortError(err)) return;
      console.warn("Failed to load colleagues", err);
    }
  }, [get, myId, conversations]);

  useEffect(() => {
    let cancelled = false;
    async function init() {
      setLoadState("loading");
      setErrorMessage(null);
      try {
        await loadConversations();
        if (!cancelled) setLoadState("ok");
      } catch {
        if (!cancelled) setLoadState("error");
      }
    }
    void init();
    return () => {
      cancelled = true;
    };
  }, [loadConversations]);

  useEffect(() => {
    if (loadState === "ok") {
      void loadColleagues();
    }
  }, [loadState, loadColleagues]);

  // Load Messages for Active Conversation
  useEffect(() => {
    const convId = activeConversationId;
    if (!convId) {
      setMessages([]);
      return;
    }

    let cancelled = false;
    async function fetchMessages() {
      try {
        const res = (await get(
          `/api/v1/chat/conversations/${convId}/messages?limit=50`
        )) as { messages: ChatMessage[] };
        if (!cancelled) {
          const chronological = (res.messages || []).slice().reverse();
          setMessages(chronological);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "auto" }), 50);

          if (chronological.length > 0) {
            const lastMsg = chronological[chronological.length - 1];
            void markActiveConversationRead(convId, lastMsg.id);
          }
        }
      } catch (err) {
        if (isAbortError(err)) return;
        console.error("Failed to load messages", err);
      }
    }

    void fetchMessages();
    return () => {
      cancelled = true;
    };
  }, [activeConversationId, get]);

  // Mark Read
  async function markActiveConversationRead(conversationId: string | null | undefined, messageId?: string | null) {
    if (!conversationId) return;
    try {
      await apiPost(`/api/v1/chat/conversations/${conversationId}/messages/read`, {
        messageId,
      });
      setConversations((prev) =>
        prev.map((c) => (c.id === conversationId ? { ...c, unreadCount: 0 } : c))
      );
    } catch {
      /* ignore read receipt error */
    }
  }

  // ── Typing Indicator Dispatcher ───────────────────────────────────────────
  function handleDraftChange(val: string) {
    setDraft(val);
    if (!activeConversationId || !wsClientRef.current) return;

    if (val.trim() && !isTypingRef.current) {
      isTypingRef.current = true;
      wsClientRef.current.sendTyping(activeConversationId, true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current && activeConversationId) {
        wsClientRef.current?.sendTyping(activeConversationId, false);
        isTypingRef.current = false;
      }
    }, 2500);
  }

  // ── File Selection & Upload ───────────────────────────────────────────────
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeConversationId) return;

    if (file.size > 2 * 1024 * 1024 * 1024) {
      setErrorMessage("File exceeds 2 GB limit");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    const isImage = file.type.startsWith("image/");
    const previewUrl = isImage ? URL.createObjectURL(file) : undefined;
    const abortController = new AbortController();

    const staged: StagedAttachment = {
      file,
      previewUrl,
      isImage,
      uploading: true,
      progress: 0,
      abortController,
    };
    setStagedAttachment(staged);
    setErrorMessage(null);

    try {
      const uploaded = await uploadFileAuto({
        file,
        service: "chat-service",
        module: "chat-attachment",
        referenceId: activeConversationId,
        signal: abortController.signal,
        onChunkProgress: (p) => {
          const pct = Math.round((p.receivedChunks / p.totalChunks) * 100);
          setStagedAttachment((prev) => (prev ? { ...prev, progress: pct } : null));
        },
      });

      setStagedAttachment((prev) =>
        prev
          ? {
              ...prev,
              fileId: uploaded.id,
              uploading: false,
              progress: 100,
            }
          : null
      );
    } catch (err: any) {
      if (isAbortError(err)) return;
      console.error("Failed to upload attachment", err);
      setErrorMessage(err instanceof ApiError ? err.message : "Failed to upload attachment");
      setStagedAttachment((prev) =>
        prev
          ? {
              ...prev,
              uploading: false,
              error: err instanceof ApiError ? err.message : "Upload failed",
            }
          : null
      );
    }
  };

  const cancelStagedAttachment = () => {
    if (stagedAttachment?.abortController) {
      stagedAttachment.abortController.abort();
    }
    if (stagedAttachment?.previewUrl) {
      URL.revokeObjectURL(stagedAttachment.previewUrl);
    }
    setStagedAttachment(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // ── Send Message ──────────────────────────────────────────────────────────
  async function handleSend(e: FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if ((!text && !stagedAttachment?.fileId) || sendBusy || !activeConversationId) return;

    if (stagedAttachment && stagedAttachment.uploading) {
      setErrorMessage("Please wait for the file to finish uploading before sending.");
      return;
    }

    setSendBusy(true);
    setErrorMessage(null);

    // Stop typing
    if (isTypingRef.current) {
      isTypingRef.current = false;
      wsClientRef.current?.sendTyping(activeConversationId, false);
    }
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    const clientMessageId = crypto.randomUUID();
    const tempReplyTo = replyingTo;
    const currentStaged = stagedAttachment;
    const isImage = currentStaged ? (currentStaged.isImage || currentStaged.file.type.startsWith("image/")) : false;
    const msgType: "TEXT" | "IMAGE" | "FILE" = currentStaged ? (isImage ? "IMAGE" : "FILE") : "TEXT";

    const attachmentPayload: ChatAttachment[] | undefined =
      currentStaged && currentStaged.fileId
        ? [
            {
              fileId: currentStaged.fileId,
              fileName: currentStaged.file.name,
              mimeType: currentStaged.file.type || "application/octet-stream",
              sizeBytes: currentStaged.file.size,
            },
          ]
        : undefined;

    // Optimistic UI update
    const tempMsg: ChatMessage = {
      id: "temp-" + clientMessageId,
      conversationId: activeConversationId,
      senderId: myId,
      clientMessageId,
      messageType: msgType,
      content: text || null,
      createdAt: new Date().toISOString(),
      replyToId: tempReplyTo ? tempReplyTo.id : null,
      replyTo: tempReplyTo
        ? {
            id: tempReplyTo.id,
            content: tempReplyTo.content || (tempReplyTo.messageType === "IMAGE" ? "📷 Photo" : "📎 Attachment"),
            messageType: tempReplyTo.messageType,
            senderId: tempReplyTo.senderId,
            sender: tempReplyTo.sender
              ? {
                  id: tempReplyTo.sender.id,
                  firstName: tempReplyTo.sender.firstName,
                  lastName: tempReplyTo.sender.lastName,
                }
              : undefined,
          }
        : null,
      reactions: [],
      sender: user as unknown as ChatUser,
      attachments: attachmentPayload,
    };

    setMessages((prev) => [...prev, tempMsg]);
    setDraft("");
    setReplyingTo(null);
    setStagedAttachment(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    if (textareaRef.current) {
      textareaRef.current.style.height = "";
    }
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      await apiPost(`/api/v1/chat/conversations/${activeConversationId}/messages`, {
        content: text || undefined,
        clientMessageId,
        messageType: msgType,
        replyToId: tempReplyTo ? tempReplyTo.id : undefined,
        attachments: attachmentPayload,
      });
    } catch (err) {
      setErrorMessage(err instanceof ApiError ? err.message : t("chat.sendFailed"));
      setMessages((prev) => prev.filter((m) => m.clientMessageId !== clientMessageId));
      setDraft(text);
      setReplyingTo(tempReplyTo);
      setStagedAttachment(currentStaged);
    } finally {
      setSendBusy(false);
    }
  }

  async function startDirectMessage(colleagueId: string) {
    try {
      const data = await apiPost("/api/v1/chat/conversations", {
        type: "DIRECT",
        participantId: colleagueId,
      });
      await loadConversations();
      setActiveConversationId((data as any).id);
    } catch (e) {
      console.error("Failed to start chat", e);
    }
  }

  // ── Reaction Toggle ────────────────────────────────────────────────────────
  async function handleToggleReaction(message: ChatMessage, emoji: string) {
    if (!activeConversationId) return;
    setActiveReactionPickerMessageId(null);

    const hasReacted = message.reactions?.some((r) => r.userId === myId && r.emoji === emoji);

    // Optimistic toggle
    setMessages((prev) =>
      prev.map((m) => {
        if (m.id !== message.id) return m;
        const current = m.reactions || [];
        if (hasReacted) {
          return { ...m, reactions: current.filter((r) => !(r.userId === myId && r.emoji === emoji)) };
        } else {
          return { ...m, reactions: [...current, { userId: myId, emoji }] };
        }
      })
    );

    try {
      if (hasReacted) {
        await removeMessageReaction(activeConversationId, message.id, emoji);
      } else {
        await addMessageReaction(activeConversationId, message.id, emoji);
      }
    } catch (err) {
      console.error("Failed to update reaction", err);
      // Revert on error
      setMessages((prev) =>
        prev.map((m) => (m.id === message.id ? { ...m, reactions: message.reactions } : m))
      );
    }
  }

  // ── Inline Message Editing ────────────────────────────────────────────────
  function startEditing(m: ChatMessage) {
    setEditingMessageId(m.id);
    setEditingText(m.content || "");
  }

  async function handleSaveEdit(messageId: string) {
    if (!activeConversationId || !editingText.trim()) return;
    const originalMsg = messages.find((m) => m.id === messageId);
    if (!originalMsg) return;

    const newText = editingText.trim();
    setEditingMessageId(null);

    // Optimistic update
    setMessages((prev) =>
      prev.map((m) => (m.id === messageId ? { ...m, content: newText, editedAt: new Date().toISOString() } : m))
    );

    try {
      await updateMessage(activeConversationId, messageId, newText);
    } catch (err) {
      console.error("Failed to edit message", err);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? originalMsg : m))
      );
    }
  }

  // ── Soft Message Deletion ─────────────────────────────────────────────────
  async function handleDeleteMessage(messageId: string) {
    if (!activeConversationId) return;
    setDeleteConfirmId(null);

    const prevList = [...messages];
    setMessages((prev) => prev.filter((m) => m.id !== messageId));

    try {
      await deleteMessage(activeConversationId, messageId);
    } catch (err) {
      console.error("Failed to delete message", err);
      setMessages(prevList);
    }
  }

  // ── Scroll to Quoted Message ───────────────────────────────────────────────
  function scrollToMessage(targetId: string) {
    const el = document.getElementById(`msg-${targetId}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      setHighlightedMessageId(targetId);
      setTimeout(() => setHighlightedMessageId(null), 2000);
    }
  }

  // Switch Conversation
  const handleSelectConversation = (id: string) => {
    if (id !== activeConversationId) {
      cancelStagedAttachment();
      setReplyingTo(null);
      setEditingMessageId(null);
      setDraft("");
      setActiveConversationId(id);
    }
  };

  // Helpers
  const getOtherParticipant = (conv: ChatConversation): ChatUser | null => {
    if (conv.type !== "DIRECT") return null;
    const other = conv.participants.find((p) => p.userId !== myId);
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

  const activeConversation = conversations.find((c) => c.id === activeConversationId);
  const channelTitle = activeConversation ? getConversationTitle(activeConversation) : "Select a conversation";

  // Check if message is read by another user in active conversation
  const isMessageReadByOther = (message: ChatMessage): boolean => {
    if (!activeConversation) return false;
    return activeConversation.participants.some((p) => {
      if (p.userId === myId) return false;
      if (p.lastReadMessageId === message.id) return true;
      if (p.lastReadAt && new Date(p.lastReadAt).getTime() >= new Date(message.createdAt).getTime()) return true;
      return false;
    });
  };

  // Group reactions for badge counter display
  const getGroupedReactions = (reactions?: ChatReaction[]) => {
    if (!reactions || reactions.length === 0) return [];
    const map = new Map<string, { count: number; reactedByMe: boolean }>();
    for (const r of reactions) {
      const curr = map.get(r.emoji) || { count: 0, reactedByMe: false };
      curr.count += 1;
      if (r.userId === myId) curr.reactedByMe = true;
      map.set(r.emoji, curr);
    }
    return Array.from(map.entries()).map(([emoji, data]) => ({ emoji, ...data }));
  };

  if (loadState === "forbidden") {
    return (
      <ForbiddenView
        resourceKey="chat.forbiddenResource"
        detail={errorMessage ?? t("chat.forbiddenDetail")}
      />
    );
  }

  // Show only colleagues who don't already have an active conversation
  const colleaguesWithoutChat = colleagues.filter((c) => {
    return !conversations.some(
      (conv) => conv.type === "DIRECT" && conv.participants.some((p) => p.userId === c.id)
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

      {/* Main Layout */}
      <div className="flex-1 min-h-0 flex bg-white border border-slate-200 shadow-sm rounded-lg overflow-hidden">
        {/* Left Sidebar (Conversations) */}
        <aside
          className={`w-full md:w-[320px] flex-shrink-0 border-r border-slate-200 bg-white flex flex-col ${
            activeConversationId ? "hidden md:flex" : "flex"
          }`}
        >
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
                        onClick={() => handleSelectConversation(c.id)}
                        className={`w-full text-left px-3 py-2.5 rounded-md flex items-center gap-3 transition-colors ${
                          isActive ? "bg-teal-600 text-white" : "hover:bg-slate-100 text-slate-700"
                        }`}
                      >
                        <div
                          className={`relative w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${
                            isActive ? "bg-white text-teal-700" : "bg-teal-700 text-white"
                          }`}
                        >
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
                                {new Date(c.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <p className={`text-xs truncate ${isActive ? "text-teal-100" : "text-slate-500"}`}>
                              {c.type === "GROUP"
                                ? "Group channel"
                                : otherUser
                                ? otherUser.email || otherUser.username || "Direct message"
                                : "Direct message"}
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
                        className="w-full text-left px-3 py-2.5 rounded-md flex items-center gap-3 hover:bg-slate-100 text-slate-700 group transition-colors"
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
        <section
          className={`flex-1 flex flex-col min-w-0 bg-slate-100 relative ${
            !activeConversationId ? "hidden md:flex" : "flex"
          }`}
        >
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
                <div className="relative w-10 h-10 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center shrink-0 font-bold">
                  <span className="material-symbols-outlined text-[20px]">
                    {activeConversation?.type === "GROUP" ? "forum" : "person"}
                  </span>
                  {activeConversation?.type !== "GROUP" &&
                    activeConversation &&
                    getOtherParticipant(activeConversation) && (
                      <span
                        className={`absolute bottom-0 right-0 w-[11px] h-[11px] rounded-full border-2 border-white ${
                          onlineUsers.has(getOtherParticipant(activeConversation)!.id)
                            ? "bg-green-500"
                            : "bg-white border-slate-300"
                        }`}
                        title={onlineUsers.has(getOtherParticipant(activeConversation)!.id) ? "Online" : "Offline"}
                      />
                    )}
                </div>
                <div className="min-w-0">
                  <h2 className="font-semibold text-slate-900 text-[15px] leading-snug truncate">{channelTitle}</h2>

                  {/* Subtitle: Typing Indicator or Presence Status */}
                  {typingUsers.size > 0 ? (
                    <div className="flex items-center gap-1.5 text-[12px] text-teal-600 font-medium leading-none mt-0.5 animate-pulse">
                      <span className="flex gap-0.5 items-center">
                        <span className="w-1 h-1 rounded-full bg-teal-600 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-1 h-1 rounded-full bg-teal-600 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-1 h-1 rounded-full bg-teal-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                      <span>
                        {typingUsers.size === 1
                          ? `${Array.from(typingUsers.values())[0]} is typing...`
                          : `${typingUsers.size} colleagues are typing...`}
                      </span>
                    </div>
                  ) : activeConversation?.type !== "GROUP" &&
                    activeConversation &&
                    getOtherParticipant(activeConversation) ? (
                    <p
                      className={`text-[12px] leading-none mt-0.5 ${
                        onlineUsers.has(getOtherParticipant(activeConversation)!.id)
                          ? "text-teal-600 font-medium"
                          : "text-slate-400"
                      }`}
                    >
                      {onlineUsers.has(getOtherParticipant(activeConversation)!.id) ? "online" : "offline"}
                    </p>
                  ) : activeConversation?.type === "GROUP" ? (
                    <p className="text-[12px] text-slate-400 leading-none mt-0.5">
                      {activeConversation.participants?.length || 0} members
                    </p>
                  ) : null}
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
              const isRead = mine && isMessageReadByOther(m);
              const isHighlighted = highlightedMessageId === m.id;
              const isEditing = editingMessageId === m.id;
              const groupedReactions = getGroupedReactions(m.reactions);

              return (
                <div
                  key={m.id}
                  id={`msg-${m.id}`}
                  className={`transition-colors duration-500 rounded-lg ${
                    isHighlighted ? "ring-2 ring-teal-500 bg-teal-50/50 p-1" : ""
                  }`}
                >
                  {showDateDivider && (
                    <div className="flex justify-center my-4">
                      <span className="bg-[#cbd5e1]/50 text-slate-600 text-[11px] font-bold px-3 py-1 rounded-full uppercase tracking-wider backdrop-blur-sm">
                        {mDate.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
                      </span>
                    </div>
                  )}

                  <div className={`flex group relative ${mine ? "justify-end" : "justify-start"} ${isContinuation ? "mt-0.5" : "mt-2"}`}>
                    {!mine && activeConversation?.type === "GROUP" && (
                      <div className="w-9 shrink-0 flex flex-col justify-end pb-1 pr-1">
                        {showAvatar && (
                          <div className="w-8 h-8 rounded-full bg-teal-700 text-white flex items-center justify-center text-[10px] font-bold">
                            {chatUserInitials(m.sender)}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Floating Hover Action Toolbar */}
                    {!isEditing && (
                      <div
                        className={`absolute -top-3.5 z-20 hidden group-hover:flex items-center gap-0.5 bg-white border border-slate-200 shadow-md rounded-full px-1.5 py-0.5 transition-all text-slate-500 ${
                          mine ? "right-2" : "left-2"
                        }`}
                      >
                        {/* Quick Reaction Button */}
                        <button
                          type="button"
                          onClick={() => setActiveReactionPickerMessageId(activeReactionPickerMessageId === m.id ? null : m.id)}
                          className="p-1 hover:text-teal-600 hover:bg-slate-100 rounded-full transition-colors"
                          title="Add reaction"
                        >
                          <span className="material-symbols-outlined text-[16px] block">add_reaction</span>
                        </button>

                        {/* Reply Button */}
                        <button
                          type="button"
                          onClick={() => {
                            setReplyingTo(m);
                            textareaRef.current?.focus();
                          }}
                          className="p-1 hover:text-teal-600 hover:bg-slate-100 rounded-full transition-colors"
                          title="Reply"
                        >
                          <span className="material-symbols-outlined text-[16px] block">reply</span>
                        </button>

                        {/* Edit Button (own TEXT messages only) */}
                        {mine && m.messageType === "TEXT" && (
                          <button
                            type="button"
                            onClick={() => startEditing(m)}
                            className="p-1 hover:text-teal-600 hover:bg-slate-100 rounded-full transition-colors"
                            title="Edit"
                          >
                            <span className="material-symbols-outlined text-[16px] block">edit</span>
                          </button>
                        )}

                        {/* Delete Button (own messages) */}
                        {mine && (
                          <button
                            type="button"
                            onClick={() => setDeleteConfirmId(m.id)}
                            className="p-1 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
                            title="Delete"
                          >
                            <span className="material-symbols-outlined text-[16px] block">delete</span>
                          </button>
                        )}
                      </div>
                    )}

                    {/* Floating Reaction Palette Popover */}
                    {activeReactionPickerMessageId === m.id && (
                      <div
                        className={`absolute -top-11 z-30 flex items-center gap-1 bg-white border border-slate-200 shadow-lg rounded-full px-2 py-1 animate-in fade-in zoom-in-95 duration-150 ${
                          mine ? "right-2" : "left-2"
                        }`}
                      >
                        {QUICK_EMOJIS.map((emoji) => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleToggleReaction(m, emoji)}
                            className="text-lg hover:scale-125 transition-transform p-0.5 rounded-full hover:bg-slate-100 leading-none"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* Message Bubble Container */}
                    <div
                      className={`relative max-w-[75%] px-3 py-1.5 shadow-sm flex flex-col ${
                        mine
                          ? "bg-[#e3fec5] rounded-l-2xl rounded-tr-2xl rounded-br-sm"
                          : "bg-white rounded-r-2xl rounded-tl-2xl rounded-bl-sm"
                      }`}
                    >
                      {/* Sender name for group chats */}
                      {!mine && activeConversation?.type === "GROUP" && showAvatar && (
                        <span className="text-[12px] font-bold text-teal-700 leading-tight mb-1">
                          {chatUserLabel(m.sender)}
                        </span>
                      )}

                      {/* Quoted Parent Message */}
                      {m.replyTo && (
                        <div
                          onClick={() => scrollToMessage(m.replyTo!.id)}
                          className="cursor-pointer mb-1.5 px-2.5 py-1 rounded bg-black/5 hover:bg-black/10 border-l-[3px] border-teal-600 transition-colors text-left select-none"
                          title="Click to jump to message"
                        >
                          <p className="text-[11px] font-bold text-teal-800 leading-tight truncate">
                            {m.replyTo.sender
                              ? `${m.replyTo.sender.firstName || ""} ${m.replyTo.sender.lastName || ""}`.trim() || "Colleague"
                              : "Message"}
                          </p>
                          <p className="text-[11px] text-slate-600 truncate leading-snug">
                            {m.replyTo.content || (m.replyTo.messageType === "IMAGE" ? "📷 Photo" : "📎 Attachment")}
                          </p>
                        </div>
                      )}

                      {/* Attachments: Images and Documents */}
                      {m.attachments && m.attachments.length > 0 && (
                        <div className="flex flex-col gap-1.5 mb-1 mt-0.5">
                          {m.attachments.map((att, idx) => {
                            const isImg = att.mimeType.startsWith("image/") || m.messageType === "IMAGE";
                            if (isImg) {
                              return (
                                <ChatImageAttachment
                                  key={att.id || att.fileId || idx}
                                  fileId={att.fileId}
                                  fileName={att.fileName}
                                  onOpenLightbox={(src, title) => setLightboxMedia({ src, title, fileId: att.fileId })}
                                />
                              );
                            }
                            return (
                              <ChatDocumentAttachment
                                key={att.id || att.fileId || idx}
                                fileId={att.fileId}
                                fileName={att.fileName}
                                sizeBytes={att.sizeBytes}
                              />
                            );
                          })}
                        </div>
                      )}

                      {/* Message Content or Inline Editor */}
                      {isEditing ? (
                        <div className="py-1 min-w-[200px]">
                          <textarea
                            value={editingText}
                            onChange={(e) => setEditingText(e.target.value)}
                            className="w-full bg-white border border-teal-400 rounded p-1.5 text-sm text-slate-900 outline-none focus:ring-1 focus:ring-teal-500 resize-none leading-relaxed"
                            rows={2}
                            autoFocus
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && !e.shiftKey) {
                                e.preventDefault();
                                handleSaveEdit(m.id);
                              }
                              if (e.key === "Escape") {
                                setEditingMessageId(null);
                              }
                            }}
                          />
                          <div className="flex items-center justify-end gap-1.5 mt-1">
                            <button
                              type="button"
                              onClick={() => setEditingMessageId(null)}
                              className="px-2 py-0.5 text-xs text-slate-600 hover:bg-slate-200 rounded"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(m.id)}
                              className="px-2.5 py-0.5 text-xs bg-teal-600 hover:bg-teal-700 text-white font-medium rounded shadow-xs"
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : m.content && m.content.trim() ? (
                        <div className="flex items-end gap-2 flex-wrap">
                          <p className="text-[14px] text-slate-900 leading-relaxed whitespace-pre-wrap break-words min-w-0 flex-1">
                            {m.content}
                            <span className="inline-block w-12 h-0"></span>
                          </p>

                          <div className="float-right -mr-1 -mb-0.5 flex items-center gap-1 select-none">
                            {m.editedAt && (
                              <span className="text-[10px] text-slate-400 italic">(edited)</span>
                            )}
                            <span className={`text-[10px] font-medium ${mine ? "text-teal-700/70" : "text-slate-400"}`}>
                              {mDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {mine && (
                              <span
                                className={`material-symbols-outlined text-[14px] ${
                                  isRead ? "text-teal-600 font-bold" : "text-slate-400"
                                }`}
                                title={isRead ? "Read" : "Sent"}
                              >
                                {isRead ? "done_all" : "check"}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        /* Only attachment without text content */
                        <div className="flex items-center justify-end gap-1 mt-0.5 select-none self-end">
                          <span className={`text-[10px] font-medium ${mine ? "text-teal-700/70" : "text-slate-400"}`}>
                            {mDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          {mine && (
                            <span
                              className={`material-symbols-outlined text-[14px] ${
                                isRead ? "text-teal-600 font-bold" : "text-slate-400"
                              }`}
                              title={isRead ? "Read" : "Sent"}
                            >
                              {isRead ? "done_all" : "check"}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Emoji Reaction Chips */}
                      {groupedReactions.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1 -mb-0.5">
                          {groupedReactions.map((gr) => (
                            <button
                              key={gr.emoji}
                              type="button"
                              onClick={() => handleToggleReaction(m, gr.emoji)}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium transition-all select-none ${
                                gr.reactedByMe
                                  ? "bg-teal-100 text-teal-800 border border-teal-300 shadow-2xs"
                                  : "bg-black/5 hover:bg-black/10 text-slate-700 border border-transparent"
                              }`}
                              title={gr.reactedByMe ? "Click to remove reaction" : "Click to react"}
                            >
                              <span>{gr.emoji}</span>
                              <span className="text-[10px] font-bold">{gr.count}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            <div ref={bottomRef} />
          </div>

          {/* Delete Message Confirmation Modal */}
          {deleteConfirmId && (
            <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-sm w-full p-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
                <h3 className="text-base font-bold text-slate-900 mb-1.5">Delete Message?</h3>
                <p className="text-xs text-slate-600 mb-4 leading-relaxed">
                  Are you sure you want to delete this message? This action will remove it for everyone in this chat.
                </p>
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setDeleteConfirmId(null)}
                    className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-md font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteMessage(deleteConfirmId)}
                    className="px-3.5 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded-md font-medium shadow-xs"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Fullscreen Lightbox Modal */}
          {lightboxMedia && (
            <div
              className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
              onClick={() => setLightboxMedia(null)}
            >
              <div className="relative max-w-4xl max-h-[92vh] flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center justify-between w-full text-white mb-2 px-2">
                  <span className="text-sm font-semibold truncate max-w-md">{lightboxMedia.title}</span>
                  <div className="flex items-center gap-2">
                    {lightboxMedia.fileId && (
                      <button
                        type="button"
                        onClick={() => {
                  downloadFile(lightboxMedia.fileId!, lightboxMedia.title).catch((err: any) => {
                    console.error("Lightbox download failed", err);
                    alert(`Download error: ${err?.message || "Failed to download image"}`);
                  });
                }}
                        className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
                        title="Download image"
                      >
                        <span className="material-symbols-outlined text-[20px]">download</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setLightboxMedia(null)}
                      className="p-1.5 rounded-full hover:bg-white/20 transition-colors text-white"
                      title="Close (Esc)"
                    >
                      <span className="material-symbols-outlined text-[20px]">close</span>
                    </button>
                  </div>
                </div>
                <img
                  src={lightboxMedia.src}
                  alt={lightboxMedia.title}
                  className="max-h-[82vh] max-w-full rounded-xl object-contain shadow-2xl bg-black/20"
                />
              </div>
            </div>
          )}

          {/* Message Composer Area */}
          <form onSubmit={handleSend} className="bg-white shrink-0 z-10 flex flex-col border-t border-slate-200">
            {/* Hidden File Input */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              className="hidden"
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.zip,.rar,.7z"
            />

            {/* Quoted Message Preview Banner */}
            {replyingTo && (
              <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-200 text-left">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="material-symbols-outlined text-teal-600 text-[18px]">reply</span>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-teal-800 leading-tight">
                      Replying to {replyingTo.sender ? `${replyingTo.sender.firstName || ""} ${replyingTo.sender.lastName || ""}`.trim() || "Colleague" : "Colleague"}
                    </p>
                    <p className="text-xs text-slate-600 truncate leading-relaxed">
                      {replyingTo.content || (replyingTo.messageType === "IMAGE" ? "📷 Photo" : "📎 Attachment")}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setReplyingTo(null)}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
                  title="Cancel reply"
                >
                  <span className="material-symbols-outlined text-[16px] block">close</span>
                </button>
              </div>
            )}

            {/* Staged Attachment Preview Chip */}
            {stagedAttachment && (
              <div className="flex items-center gap-3 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                {stagedAttachment.isImage && stagedAttachment.previewUrl ? (
                  <img
                    src={stagedAttachment.previewUrl}
                    alt="Preview"
                    className="w-12 h-12 object-cover rounded-lg border border-slate-300 shadow-2xs shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[20px]">
                      {stagedAttachment.file.type.includes("pdf") ? "picture_as_pdf" : "draft"}
                    </span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-slate-800 truncate">{stagedAttachment.file.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-500">
                      {stagedAttachment.file.size / (1024 * 1024) < 1
                        ? `${(stagedAttachment.file.size / 1024).toFixed(1)} KB`
                        : stagedAttachment.file.size / (1024 * 1024 * 1024) < 1
                        ? `${(stagedAttachment.file.size / (1024 * 1024)).toFixed(1)} MB`
                        : `${(stagedAttachment.file.size / (1024 * 1024 * 1024)).toFixed(2)} GB`}
                    </span>
                    {stagedAttachment.uploading && (
                      <span className="inline-flex items-center gap-1 text-[11px] text-teal-600 font-medium">
                        <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                        Uploading {stagedAttachment.progress > 0 ? `${stagedAttachment.progress}%` : ""}
                      </span>
                    )}
                    {stagedAttachment.error && (
                      <span className="text-[11px] text-red-600 font-medium">{stagedAttachment.error}</span>
                    )}
                    {!stagedAttachment.uploading && !stagedAttachment.error && stagedAttachment.fileId && (
                      <span className="inline-flex items-center gap-0.5 text-[11px] text-emerald-600 font-medium">
                        <span className="material-symbols-outlined text-[14px]">check_circle</span>
                        Ready
                      </span>
                    )}
                  </div>
                  {stagedAttachment.uploading && stagedAttachment.progress > 0 && (
                    <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden mt-1.5">
                      <div
                        className="bg-teal-600 h-full transition-all duration-200"
                        style={{ width: `${stagedAttachment.progress}%` }}
                      />
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={cancelStagedAttachment}
                  className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors shrink-0"
                  title="Remove attachment"
                >
                  <span className="material-symbols-outlined text-[18px] block">close</span>
                </button>
              </div>
            )}

            <div className="flex items-end gap-1 px-3 py-1.5">
              {/* Attachment Icon */}
              <button
                type="button"
                disabled={!activeConversationId}
                onClick={() => fileInputRef.current?.click()}
                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-teal-600 disabled:opacity-40 transition-colors shrink-0 rounded-full hover:bg-slate-100"
                title="Attach file or photo"
              >
                <span className="material-symbols-outlined text-[24px]">attach_file</span>
              </button>

              {/* Textarea Area */}
              <div className="flex-1 flex items-center min-w-0">
                <textarea
                  ref={textareaRef}
                  rows={1}
                  value={draft}
                  onChange={(e) => handleDraftChange(e.target.value)}
                  disabled={sendBusy || !activeConversationId}
                  placeholder={
                    !activeConversationId
                      ? "Select a conversation to send a message..."
                      : replyingTo
                      ? "Write a reply..."
                      : stagedAttachment
                      ? "Add a caption or send..."
                      : "Write a message..."
                  }
                  className="w-full bg-transparent py-2 px-2 text-[15px] text-slate-900 placeholder:text-slate-400 resize-none border-0 border-none outline-none ring-0 focus:border-0 focus:border-none focus:outline-none focus:ring-0 focus:ring-transparent shadow-none focus:shadow-none disabled:opacity-50 min-h-[40px] max-h-[140px] leading-relaxed custom-scrollbar"
                  style={{ border: "none", outline: "none", boxShadow: "none" }}
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
                onClick={() => setDraft((prev) => prev + " 😊")}
                className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-teal-600 disabled:opacity-40 transition-colors shrink-0 rounded-full hover:bg-slate-100"
                title="Emoji"
              >
                <span className="material-symbols-outlined text-[24px]">sentiment_satisfied</span>
              </button>

              {/* Mic / Send Button */}
              {draft.trim() || stagedAttachment?.fileId ? (
                <button
                  type="submit"
                  disabled={sendBusy || stagedAttachment?.uploading}
                  className="w-10 h-10 rounded-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white flex items-center justify-center transition-all shrink-0 shadow-sm"
                  title="Send"
                >
                  <span className="material-symbols-outlined text-[20px] ml-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                    send
                  </span>
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
