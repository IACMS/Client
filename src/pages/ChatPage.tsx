import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { ApiError, apiPost, isAbortError } from "@/lib/api";
import {
  type ChatConversation,
  type ChatMessage,
  type ChatReaction,
  type ChatUser,
  type ChatAttachment,
  type ChatParticipant,
  chatUserInitials,
  chatUserLabel,
  ChatWebSocketClient,
  addMessageReaction,
  removeMessageReaction,
  updateMessage,
  deleteMessage,
  createGroupConversation,
  fetchParticipants,
  addParticipant,
  removeParticipant,
  toggleMuteConversation,
  pinMessage,
  unpinMessage,
  fetchPinnedMessage,
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

const EMOJI_CATEGORIES = [
  {
    id: "smileys",
    name: "Smileys",
    icon: "sentiment_satisfied",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "🙃", "😉", "😊", "😇", "🥰", "😍", "🤩", "😘", "😗",
      "😚", "😙", "😋", "😛", "😜", "🤪", "😝", "🤑", "🤗", "🤭", "🤫", "🤔", "🤐", "🤨", "😐", "😑", "😶", "😏",
      "😒", "🙄", "😬", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷", "🤒", "🤕", "🤢", "🤮", "🤧", "🥵", "🥶", "🥴",
      "😵", "🤯", "🤠", "🥳", "🥸", "😎", "🤓", "🧐", "😕", "😟", "🙁", "😮", "😯", "😲", "😳", "🥺", "😦", "😧",
      "😨", "😰", "😥", "😢", "😭", "😱", "😖", "😣", "😞", "😓", "😩", "😫", "🥱", "😤", "😡", "😠", "🤬", "💀",
      "💩", "🤡", "👻", "👽", "🤖"
    ],
  },
  {
    id: "gestures",
    name: "Gestures",
    icon: "pan_tool",
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞", "🤟", "🤘", "🤙", "👈", "👉", "👆", "🖕", "👇",
      "☝️", "👍", "👎", "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏", "✍️", "💪", "🧠", "👀", "👁️",
      "👂", "👃", "👣", "🗣️", "👤", "👥"
    ],
  },
  {
    id: "hearts",
    name: "Hearts & Vibes",
    icon: "favorite",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖", "💘", "💝",
      "💟", "💯", "✨", "⭐", "🌟", "💥", "🔥", "🎉", "🎊", "🏆", "🥇", "🎯", "🚩", "⚠️", "🚫", "💡", "📌", "📍",
      "🔔", "💎", "🔮", "🪄"
    ],
  },
  {
    id: "objects",
    name: "Work & Objects",
    icon: "folder",
    emojis: [
      "📁", "📂", "📄", "📋", "📊", "📈", "📉", "📅", "📆", "⏱️", "⏰", "📱", "💻", "🖥️", "⌨️", "✉️", "📧", "📦",
      "🔒", "🔓", "🔑", "🔍", "🔎", "💬", "💭", "☕", "🍕", "🚀", "💼", "🗂️", "📎", "🔗", "🏷️", "📝", "✏️", "✒️",
      "🛠️", "⚙️", "🛡️", "📞"
    ],
  },
];

function EmojiPickerPopover({
  onSelect,
  onClose,
}: {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}) {
  const [activeCategory, setActiveCategory] = useState("smileys");

  const currentCat = EMOJI_CATEGORIES.find((c) => c.id === activeCategory) || EMOJI_CATEGORIES[0];

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="absolute bottom-full right-2 sm:right-10 mb-2 z-40 w-72 sm:w-80 bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150 flex flex-col"
    >
      {/* Category Tabs */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-2 py-1.5">
        <div className="flex items-center gap-1">
          {EMOJI_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setActiveCategory(cat.id)}
              className={`p-1.5 rounded-lg transition-colors flex items-center justify-center cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-teal-100 text-teal-700 font-bold"
                  : "text-slate-500 hover:text-slate-800 hover:bg-slate-100"
              }`}
              title={cat.name}
            >
              <span className="material-symbols-outlined text-[18px]">{cat.icon}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 cursor-pointer"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      {/* Emoji Grid */}
      <div className="p-2 max-h-56 overflow-y-auto custom-scrollbar grid grid-cols-7 sm:grid-cols-8 gap-1 select-none">
        {currentCat.emojis.map((emoji, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => onSelect(emoji)}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-lg hover:bg-slate-100 active:scale-90 transition-transform cursor-pointer"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Audio / Voice message attachment player with Play/Pause, scrubber, and duration */
function ChatAudioAttachment({
  fileId,
  fileName,
  sizeBytes,
}: {
  fileId: string;
  fileName: string;
  sizeBytes?: number;
}) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const audioSrc = `/api/v1/files/${fileId}/download`;

  // Parse duration from filename e.g. "Voice message (0:14).webm"
  const parseDurationFromName = (name: string): number => {
    const match = name.match(/\((\d+):(\d+)\)/);
    if (match) {
      return parseInt(match[1], 10) * 60 + parseInt(match[2], 10);
    }
    return 0;
  };

  const fallbackDuration = parseDurationFromName(fileName);
  const effectiveDuration = isFinite(duration) && !isNaN(duration) && duration > 0 ? duration : fallbackDuration;

  const togglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play().catch(console.error);
    }
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      const cur = audioRef.current.currentTime;
      if (isFinite(cur) && !isNaN(cur)) {
        setCurrentTime(cur);
      }
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      const d = audioRef.current.duration;
      if (isFinite(d) && !isNaN(d) && d > 0) {
        setDuration(d);
      } else {
        // Chromium WebM duration fix
        const audio = audioRef.current;
        const initial = audio.currentTime;
        audio.currentTime = 1e8;
        audio.ontimeupdate = () => {
          audio.ontimeupdate = null;
          if (isFinite(audio.duration) && !isNaN(audio.duration) && audio.duration > 0) {
            setDuration(audio.duration);
          }
          audio.currentTime = initial;
        };
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
    const val = parseFloat(e.target.value);
    if (isFinite(val) && !isNaN(val)) {
      setCurrentTime(val);
      if (audioRef.current) {
        audioRef.current.currentTime = val;
      }
    }
  };

  const formatSec = (secs: number) => {
    if (typeof secs !== "number" || isNaN(secs) || !isFinite(secs) || secs < 0) return "0:00";
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m}:${s < 10 ? "0" : ""}${s}`;
  };

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      className="flex items-center gap-3 p-2.5 my-1 rounded-2xl bg-teal-500/10 border border-teal-500/20 max-w-xs shadow-xs"
    >
      <audio
        ref={audioRef}
        src={audioSrc}
        preload="metadata"
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          setCurrentTime(0);
        }}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
      />
      <button
        type="button"
        onClick={togglePlay}
        className="w-10 h-10 rounded-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center shrink-0 shadow-sm transition-transform active:scale-95 cursor-pointer"
        title={isPlaying ? "Pause" : "Play audio"}
      >
        <span className="material-symbols-outlined text-[24px]">
          {isPlaying ? "pause" : "play_arrow"}
        </span>
      </button>
      <div className="flex-1 min-w-0 flex flex-col gap-1 pr-1">
        <input
          type="range"
          min={0}
          max={effectiveDuration > 0 ? effectiveDuration : 100}
          step={0.1}
          value={isFinite(currentTime) && !isNaN(currentTime) ? currentTime : 0}
          onChange={handleSeek}
          className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-teal-600"
        />
        <div className="flex items-center justify-between text-[11px] text-teal-800 font-semibold px-0.5 gap-2 select-none">
          <span>{formatSec(currentTime)}</span>
          <span>{effectiveDuration > 0 ? formatSec(effectiveDuration) : (sizeBytes ? `${(sizeBytes / 1024).toFixed(0)} KB` : "0:00")}</span>
        </div>
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

  // ── Phase 2.1 & 2.3 State: Search, Pinned, Groups, Drawer ────────────────
  const [searchQuery, setSearchQuery] = useState("");
  const [typingUsers, setTypingUsers] = useState<Map<string, string>>(new Map());
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [activeReactionPickerMessageId, setActiveReactionPickerMessageId] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);

  // ── Pinned Message State ──────────────────────────────────────────────────
  const [pinnedMessage, setPinnedMessage] = useState<ChatMessage | null>(null);

  // ── New Group Modal State ─────────────────────────────────────────────────
  const [isNewGroupModalOpen, setIsNewGroupModalOpen] = useState(false);
  const [groupTitle, setGroupTitle] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [selectedColleagues, setSelectedColleagues] = useState<Set<string>>(new Set());
  const [groupColleagueFilter, setGroupColleagueFilter] = useState("");
  const [createGroupBusy, setCreateGroupBusy] = useState(false);
  const [createGroupError, setCreateGroupError] = useState<string | null>(null);

  // ── Group Details Drawer State ────────────────────────────────────────────
  const [showDetailsDrawer, setShowDetailsDrawer] = useState(false);
  const [activeParticipants, setActiveParticipants] = useState<ChatParticipant[]>([]);
  const [isMuted, setIsMuted] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [addMemberFilter, setAddMemberFilter] = useState("");
  const [drawerTab, setDrawerTab] = useState<"members" | "media">("members");

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

  // ── Phase 2.3 State: Audio Recording & Rich Emoji Picker ───────────────────
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [isLockedAudio, setIsLockedAudio] = useState(false);
  const [isPausedAudio, setIsPausedAudio] = useState(false);
  const [slideUpOffset, setSlideUpOffset] = useState(0);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isUploadingAudio, setIsUploadingAudio] = useState(false);
  const isRecordingAudioRef = useRef<boolean>(false);
  const isLockedAudioRef = useRef<boolean>(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);
  const recordingDurationRef = useRef<number>(0);
  const audioStreamRef = useRef<MediaStream | null>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const micTouchStartY = useRef<number | null>(null);
  const micTouchStartX = useRef<number | null>(null);
  const micPressStartTimeRef = useRef<number>(0);

  // Close emoji picker on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(e.target as Node)) {
        setIsEmojiPickerOpen(false);
      }
    }
    if (isEmojiPickerOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isEmojiPickerOpen]);

  // Clean up audio recorder on unmount
  useEffect(() => {
    return () => {
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((t) => t.stop());
      }
    };
  }, []);

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

      // Pinned Message Updated
      if (evt.type === "MESSAGE_PINNED") {
        if (evt.data?.conversationId === activeConversationIdRef.current) {
          setPinnedMessage(evt.data.message);
        }
        return;
      }

      if (evt.type === "MESSAGE_UNPINNED") {
        if (evt.data?.conversationId === activeConversationIdRef.current) {
          setPinnedMessage(null);
        }
        return;
      }

      // Participants Updated
      if (evt.type === "PARTICIPANT_ADDED" || evt.type === "PARTICIPANT_REMOVED") {
        const curId = activeConversationIdRef.current;
        if (curId && evt.data?.conversationId === curId) {
          void fetchParticipants(curId).then((res) => {
            setActiveParticipants(res.participants || []);
          }).catch(() => {});
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

  const loadParticipants = useCallback(async (convId: string) => {
    try {
      const res = await fetchParticipants(convId);
      setActiveParticipants(res.participants || []);
      const me = (res.participants || []).find((p) => p.userId === myId);
      if (me) setIsMuted(Boolean(me.isMuted));
    } catch (e) {
      console.warn("Failed to load participants", e);
    }
  }, [myId]);

  // Load Messages, Pinned, and Participants for Active Conversation
  useEffect(() => {
    const convId = activeConversationId;
    if (!convId) {
      setMessages([]);
      setPinnedMessage(null);
      setActiveParticipants([]);
      setShowDetailsDrawer(false);
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

    // Fetch Pinned Message
    void fetchPinnedMessage(convId).then((res) => {
      if (!cancelled) setPinnedMessage(res.pinnedMessage);
    }).catch(() => {});

    // Fetch Participants
    void loadParticipants(convId);

    return () => {
      cancelled = true;
    };
  }, [activeConversationId, get, loadParticipants]);

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

  // ── Audio Recording Helpers ───────────────────────────────────────────────
  const startRecordingAudio = async () => {
    if (!activeConversationId) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStreamRef.current = stream;
      audioChunksRef.current = [];

      let mimeType = "audio/webm;codecs=opus";
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = MediaRecorder.isTypeSupported("audio/webm")
          ? "audio/webm"
          : (MediaRecorder.isTypeSupported("audio/mp4") ? "audio/mp4" : "");
      }

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          audioChunksRef.current.push(e.data);
        }
      };

      recorder.start(200);
      isRecordingAudioRef.current = true;
      setIsRecordingAudio(true);
      setIsPausedAudio(false);
      setRecordingDuration(0);
      recordingDurationRef.current = 0;

      recordingTimerRef.current = setInterval(() => {
        recordingDurationRef.current += 1;
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    } catch (err: any) {
      console.error("Microphone access error:", err);
      setIsRecordingAudio(false);
      setIsLockedAudio(false);
      alert(
        err?.name === "NotAllowedError"
          ? "Microphone access was denied. Please allow microphone permissions in your browser to record voice messages."
          : `Failed to access microphone: ${err?.message || "Unknown error"}`
      );
    }
  };

  const togglePauseAudio = () => {
    if (!mediaRecorderRef.current) return;
    if (mediaRecorderRef.current.state === "recording") {
      mediaRecorderRef.current.pause();
      setIsPausedAudio(true);
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
    } else if (mediaRecorderRef.current.state === "paused") {
      mediaRecorderRef.current.resume();
      setIsPausedAudio(false);
      recordingTimerRef.current = setInterval(() => {
        recordingDurationRef.current += 1;
        setRecordingDuration((prev) => prev + 1);
      }, 1000);
    }
  };

  const cancelRecordingAudio = () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    if (audioStreamRef.current) {
      audioStreamRef.current.getTracks().forEach((t) => t.stop());
      audioStreamRef.current = null;
    }
    audioChunksRef.current = [];
    isRecordingAudioRef.current = false;
    isLockedAudioRef.current = false;
    setIsRecordingAudio(false);
    setIsLockedAudio(false);
    setIsPausedAudio(false);
    setSlideUpOffset(0);
    setRecordingDuration(0);
    recordingDurationRef.current = 0;
    micTouchStartY.current = null;
    micTouchStartX.current = null;
  };

  const stopAndSendAudio = async () => {
    if (!mediaRecorderRef.current || !activeConversationId) return;

    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }

    const durationSec = recordingDurationRef.current || recordingDuration;
    isRecordingAudioRef.current = false;
    isLockedAudioRef.current = false;
    setIsRecordingAudio(false);
    setIsLockedAudio(false);
    setIsPausedAudio(false);
    setSlideUpOffset(0);
    setIsUploadingAudio(true);
    micTouchStartY.current = null;
    micTouchStartX.current = null;

    const recorder = mediaRecorderRef.current;

    recorder.onstop = async () => {
      try {
        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((t) => t.stop());
          audioStreamRef.current = null;
        }

        const mimeType = recorder.mimeType || "audio/webm";
        const ext = mimeType.includes("mp4") ? "mp4" : (mimeType.includes("ogg") ? "ogg" : "webm");
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const formatTime = (s: number) => {
          const m = Math.floor(s / 60);
          const rem = s % 60;
          return `${m}:${rem < 10 ? "0" : ""}${rem}`;
        };
        const fileName = `Voice message (${formatTime(durationSec)}).${ext}`;
        const file = new File([blob], fileName, { type: mimeType });

        const uploaded = await uploadFileAuto({
          file,
          service: "chat-service",
          module: "chat-attachment",
          referenceId: activeConversationId,
        });

        const clientMessageId = crypto.randomUUID();
        const attachmentPayload: ChatAttachment[] = [
          {
            fileId: uploaded.id,
            fileName,
            mimeType,
            sizeBytes: file.size,
          },
        ];

        // Send with content = "" so no redundant "voice message" text is saved or shown
        const res = (await apiPost(
          `/api/v1/chat/conversations/${activeConversationId}/messages`,
          {
            content: "",
            clientMessageId,
            messageType: "FILE",
            attachments: attachmentPayload,
          }
        )) as { message?: ChatMessage };

        if (res && res.message) {
          setMessages((prev) => [...prev, res.message!]);
          setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
        }
      } catch (err: any) {
        console.error("Failed to send voice message:", err);
        setErrorMessage(err?.message || "Failed to send voice message");
      } finally {
        setIsUploadingAudio(false);
        setRecordingDuration(0);
        recordingDurationRef.current = 0;
        audioChunksRef.current = [];
      }
    };

    recorder.stop();
  };

  const lockAudioRecording = () => {
    isLockedAudioRef.current = true;
    setIsLockedAudio(true);
    setSlideUpOffset(0);
    micTouchStartY.current = null;
    micTouchStartX.current = null;
  };

  // Window-level tracking during recording so dragging or moving up works anywhere on screen
  useEffect(() => {
    if (!isRecordingAudio || isLockedAudio) return;

    const onWindowMove = (clientY: number, clientX: number) => {
      if (isLockedAudioRef.current || micTouchStartY.current === null) return;
      const deltaY = micTouchStartY.current - clientY;
      const deltaX = micTouchStartX.current !== null ? micTouchStartX.current - clientX : 0;

      if (deltaY > 0) {
        setSlideUpOffset(Math.min(deltaY, 60));
        if (deltaY >= 20) {
          lockAudioRecording();
          return;
        }
      }

      if (deltaX >= 70) {
        cancelRecordingAudio();
      }
    };

    const handleWindowPointerMove = (e: PointerEvent) => {
      onWindowMove(e.clientY, e.clientX);
    };

    const handleWindowTouchMove = (e: TouchEvent) => {
      if (e.touches[0]) {
        onWindowMove(e.touches[0].clientY, e.touches[0].clientX);
      }
    };

    const handleWindowRelease = () => {
      if (isLockedAudioRef.current) return;
      
      const durationHeldMs = Date.now() - micPressStartTimeRef.current;
      micTouchStartY.current = null;
      micTouchStartX.current = null;

      // If user held and released after speaking (> 350ms):
      if (durationHeldMs > 350) {
        if (recordingDurationRef.current < 1) {
          cancelRecordingAudio();
        } else {
          void stopAndSendAudio();
        }
      }
      // If it was a quick click (< 350ms), we keep recording alive so user can tap or hover the lock pill!
    };

    window.addEventListener("pointermove", handleWindowPointerMove);
    window.addEventListener("pointerup", handleWindowRelease);
    window.addEventListener("touchmove", handleWindowTouchMove);
    window.addEventListener("touchend", handleWindowRelease);

    return () => {
      window.removeEventListener("pointermove", handleWindowPointerMove);
      window.removeEventListener("pointerup", handleWindowRelease);
      window.removeEventListener("touchmove", handleWindowTouchMove);
      window.removeEventListener("touchend", handleWindowRelease);
    };
  }, [isRecordingAudio, isLockedAudio]);

  const handleMicPointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!activeConversationId || isUploadingAudio || sendBusy) return;

    // If already recording unlocked, second click acts as stop & send
    if (isRecordingAudioRef.current && !isLockedAudioRef.current) {
      void stopAndSendAudio();
      return;
    }

    micPressStartTimeRef.current = Date.now();
    micTouchStartY.current = e.clientY;
    micTouchStartX.current = e.clientX;
    isLockedAudioRef.current = false;
    setIsLockedAudio(false);
    setSlideUpOffset(0);
    void startRecordingAudio();
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

  // ── Pinned Message Handlers ────────────────────────────────────────────────
  async function handleTogglePinMessage(m: ChatMessage) {
    if (!activeConversationId) return;
    try {
      if (pinnedMessage?.id === m.id) {
        await unpinMessage(activeConversationId);
        setPinnedMessage(null);
      } else {
        await pinMessage(activeConversationId, m.id);
        setPinnedMessage(m);
      }
    } catch (err: any) {
      console.error("Failed to toggle pin message", err);
    }
  }

  async function handleUnpinMessage() {
    if (!activeConversationId) return;
    try {
      await unpinMessage(activeConversationId);
      setPinnedMessage(null);
    } catch (err: any) {
      console.error("Failed to unpin message", err);
    }
  }

  // ── New Group Creation ─────────────────────────────────────────────────────
  async function handleCreateGroup(e: FormEvent) {
    e.preventDefault();
    if (!groupTitle.trim() || selectedColleagues.size === 0 || createGroupBusy) return;

    setCreateGroupBusy(true);
    setCreateGroupError(null);
    try {
      const newConv = (await createGroupConversation(
        groupTitle.trim(),
        Array.from(selectedColleagues),
        groupDesc.trim() || undefined
      )) as ChatConversation;

      setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== newConv.id)]);
      setIsNewGroupModalOpen(false);
      setGroupTitle("");
      setGroupDesc("");
      setSelectedColleagues(new Set());
      handleSelectConversation(newConv.id);
    } catch (err: any) {
      setCreateGroupError(err.message || "Failed to create group channel");
    } finally {
      setCreateGroupBusy(false);
    }
  }

  // ── Participant & Mute Handlers ────────────────────────────────────────────
  async function handleToggleMute() {
    if (!activeConversationId) return;
    const next = !isMuted;
    setIsMuted(next);
    try {
      await toggleMuteConversation(activeConversationId, next);
    } catch {
      setIsMuted(!next);
    }
  }

  async function handleAddMember(userId: string) {
    if (!activeConversationId) return;
    try {
      await addParticipant(activeConversationId, userId);
      setShowAddMember(false);
      setAddMemberFilter("");
      void loadParticipants(activeConversationId);
    } catch (err: any) {
      alert(err.message || "Failed to add member");
    }
  }

  async function handleRemoveMember(userId: string) {
    if (!activeConversationId) return;
    const isSelf = userId === myId;
    if (!confirm(isSelf ? "Are you sure you want to leave this group?" : "Remove this member from group?")) return;
    try {
      await removeParticipant(activeConversationId, userId);
      if (isSelf) {
        setConversations((prev) => prev.filter((c) => c.id !== activeConversationId));
        setActiveConversationId(null);
        setShowDetailsDrawer(false);
      } else {
        void loadParticipants(activeConversationId);
      }
    } catch (err: any) {
      alert(err.message || "Failed to remove member");
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

  // Filtered Conversations via Search
  const filteredConversations = conversations.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const title = getConversationTitle(c).toLowerCase();
    const hasParticipant = c.participants?.some((p) => {
      const u = p.user;
      return (
        u?.firstName?.toLowerCase().includes(q) ||
        u?.lastName?.toLowerCase().includes(q) ||
        u?.email?.toLowerCase().includes(q) ||
        u?.username?.toLowerCase().includes(q)
      );
    });
    return title.includes(q) || hasParticipant;
  });

  // Show only colleagues who don't already have an active direct conversation
  const colleaguesWithoutChat = colleagues.filter((c) => {
    return !conversations.some(
      (conv) => conv.type === "DIRECT" && conv.participants.some((p) => p.userId === c.id)
    );
  });

  const filteredColleagues = colleaguesWithoutChat.filter((c) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = chatUserLabel(c).toLowerCase();
    const email = (c.email || "").toLowerCase();
    return name.includes(q) || email.includes(q);
  });

  // Extract shared media attachments for active conversation
  const sharedAttachments = messages.flatMap((m) =>
    (m.attachments || []).map((att) => ({
      ...att,
      sender: m.sender,
      createdAt: m.createdAt,
      messageId: m.id,
    }))
  );

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
          {/* Sidebar Header: Title, + New Group, Search Bar */}
          <div className="p-3 border-b border-slate-200 bg-slate-50/70 flex flex-col gap-2.5">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-800 tracking-tight">Messages</h2>
              <button
                type="button"
                onClick={() => setIsNewGroupModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white shadow-xs transition-colors"
                title="Create new group channel"
              >
                <span className="material-symbols-outlined text-[16px]">group_add</span>
                New Group
              </button>
            </div>
            {/* Search Input */}
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chats & colleagues..."
                className="w-full pl-8 pr-7 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:border-teal-500 placeholder:text-slate-400 text-slate-800"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar flex flex-col">
            <div className="p-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Conversations</p>
                {searchQuery && (
                  <span className="text-[11px] text-teal-600 font-medium">
                    {filteredConversations.length} found
                  </span>
                )}
              </div>
              <ul className="space-y-0.5">
                {filteredConversations.length === 0 && (
                  <p className="text-xs text-slate-400 p-3 text-center bg-slate-50 rounded-lg">
                    {searchQuery ? "No matching conversations" : "No active conversations"}
                  </p>
                )}
                {filteredConversations.map((c) => {
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
                                ? `${c.participants?.length || 0} members`
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
            {filteredColleagues.length > 0 && (
              <div className="p-3 border-t border-slate-100 mt-2">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2">Direct Message</p>
                <ul className="space-y-0.5">
                  {filteredColleagues.map((c) => (
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
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {c.email || c.username || "Staff"}
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
                      {activeParticipants.length || activeConversation.participants?.length || 0} members
                    </p>
                  ) : null}
                </div>

                {/* Right side info / details toggle button */}
                <div className="ml-auto flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => setShowDetailsDrawer((prev) => !prev)}
                    className={`p-2 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-slate-100 transition-colors ${
                      showDetailsDrawer ? "bg-teal-50 text-teal-700" : ""
                    }`}
                    title="Conversation details, participants & shared files"
                  >
                    <span className="material-symbols-outlined text-[20px] block">info</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="min-w-0">
                <h2 className="font-semibold text-slate-400 text-[15px] leading-snug truncate">No chat selected</h2>
              </div>
            )}
          </div>

          {/* Pinned Message Sticky Banner */}
          {activeConversationId && pinnedMessage && (
            <div className="px-4 py-2 bg-amber-50 border-b border-amber-200/80 flex items-center justify-between gap-3 text-xs shrink-0 z-10 shadow-xs">
              <div
                onClick={() => scrollToMessage(pinnedMessage.id)}
                className="flex items-center gap-2 min-w-0 cursor-pointer flex-1 group"
                title="Click to jump to message"
              >
                <span className="material-symbols-outlined text-[16px] text-amber-600 shrink-0">push_pin</span>
                <div className="min-w-0 flex items-baseline gap-1.5 truncate">
                  <span className="font-bold text-amber-900 shrink-0">Pinned</span>
                  <span className="text-slate-400 shrink-0">•</span>
                  <span className="font-semibold text-slate-800 shrink-0">
                    {pinnedMessage.sender ? chatUserLabel(pinnedMessage.sender) : "Colleague"}:
                  </span>
                  <span className="text-slate-600 truncate group-hover:text-amber-800 transition-colors">
                    {pinnedMessage.content || (pinnedMessage.attachments?.length ? `📎 ${pinnedMessage.attachments[0].fileName}` : "Attachment")}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => scrollToMessage(pinnedMessage.id)}
                  className="px-2 py-0.5 rounded text-[11px] font-semibold text-amber-800 hover:bg-amber-100 transition-colors"
                >
                  View
                </button>
                <button
                  type="button"
                  onClick={handleUnpinMessage}
                  className="p-1 rounded-full text-amber-600 hover:text-amber-900 hover:bg-amber-100 transition-colors"
                  title="Unpin message"
                >
                  <span className="material-symbols-outlined text-[14px] block">close</span>
                </button>
              </div>
            </div>
          )}

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

                        {/* Pin / Unpin Button */}
                        <button
                          type="button"
                          onClick={() => handleTogglePinMessage(m)}
                          className={`p-1 hover:text-amber-600 hover:bg-slate-100 rounded-full transition-colors ${
                            pinnedMessage?.id === m.id ? "text-amber-600" : ""
                          }`}
                          title={pinnedMessage?.id === m.id ? "Unpin message" : "Pin message"}
                        >
                          <span className="material-symbols-outlined text-[16px] block">push_pin</span>
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

                      {/* Attachments: Images, Audio, and Documents */}
                      {m.attachments && m.attachments.length > 0 && (
                        <div className="flex flex-col gap-1.5 mb-1 mt-0.5">
                          {m.attachments.map((att, idx) => {
                            const isImg = att.mimeType.startsWith("image/") || m.messageType === "IMAGE";
                            const isAudio =
                              att.mimeType.startsWith("audio/") ||
                              att.fileName.endsWith(".webm") ||
                              att.fileName.endsWith(".ogg") ||
                              att.fileName.endsWith(".mp3") ||
                              att.fileName.endsWith(".wav") ||
                              att.fileName.endsWith(".m4a");

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
                            if (isAudio) {
                              return (
                                <ChatAudioAttachment
                                  key={att.id || att.fileId || idx}
                                  fileId={att.fileId}
                                  fileName={att.fileName}
                                  sizeBytes={att.sizeBytes}
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
                      ) : m.content && m.content.trim() && !m.content.startsWith("🎤 Voice message") && m.content !== "Voice message" ? (
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

            <div className={`flex items-end gap-1 px-3 py-1.5 transition-colors ${
              isRecordingAudio ? "bg-teal-50/60" : ""
            }`}>
              {/* Attachment Icon (hidden while recording) */}
              {!isRecordingAudio && (
                <button
                  type="button"
                  disabled={!activeConversationId}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-teal-600 disabled:opacity-40 transition-colors shrink-0 rounded-full hover:bg-slate-100"
                  title="Attach file or photo"
                >
                  <span className="material-symbols-outlined text-[24px]">attach_file</span>
                </button>
              )}

              {/* Center: Message Text Area or Seamless Recording Bar */}
              {isRecordingAudio ? (
                <div className="flex-1 flex items-center justify-between min-h-[40px] px-2 py-0.5">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-2.5 h-2.5 rounded-full bg-teal-500 shrink-0 ${isPausedAudio ? "" : "animate-ping"}`} />
                    <span className="text-teal-900 font-bold text-sm font-mono tracking-wide">
                      {Math.floor(recordingDuration / 60).toString().padStart(2, "0")}:{(recordingDuration % 60).toString().padStart(2, "0")}
                    </span>
                    {isPausedAudio && (
                      <span className="text-[10px] text-teal-800 bg-teal-100/90 px-2 py-0.5 rounded-full font-semibold">
                        Paused
                      </span>
                    )}
                  </div>

                  {isLockedAudio ? (
                    <div className="flex items-center gap-1">
                      {/* Pause button comes first */}
                      <button
                        type="button"
                        onClick={togglePauseAudio}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-teal-700 hover:text-teal-900 hover:bg-teal-100/80 transition-colors cursor-pointer"
                        title={isPausedAudio ? "Resume recording" : "Pause recording"}
                      >
                        <span className="material-symbols-outlined text-[20px]">
                          {isPausedAudio ? "play_arrow" : "pause"}
                        </span>
                      </button>
                      {/* Delete / Cancel button comes second */}
                      <button
                        type="button"
                        onClick={cancelRecordingAudio}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-slate-100 transition-colors cursor-pointer"
                        title="Cancel recording"
                      >
                        <span className="material-symbols-outlined text-[20px]">delete</span>
                      </button>
                    </div>
                  ) : (
                    <div className="text-xs text-slate-400 flex items-center gap-1 select-none">
                      <span className="material-symbols-outlined text-[16px]">chevron_left</span>
                      <span>Slide left to cancel</span>
                    </div>
                  )}
                </div>
              ) : isUploadingAudio ? (
                <div className="flex-1 flex items-center gap-2.5 px-3 min-h-[40px] text-xs text-teal-700 font-semibold animate-pulse">
                  <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                  <span>Uploading voice message...</span>
                </div>
              ) : (
                <div className="flex-1 min-w-0">
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
              )}

              {/* Emoji Picker Popover & Smile Button (hidden while recording) */}
              {!isRecordingAudio && (
                <div className="relative" ref={emojiPickerRef}>
                  <button
                    type="button"
                    disabled={!activeConversationId}
                    onClick={() => setIsEmojiPickerOpen((prev) => !prev)}
                    className={`w-10 h-10 flex items-center justify-center transition-colors shrink-0 rounded-full ${
                      isEmojiPickerOpen ? "text-teal-600 bg-teal-50" : "text-slate-400 hover:text-teal-600 hover:bg-slate-100"
                    } disabled:opacity-40 cursor-pointer`}
                    title="Emoji Picker"
                  >
                    <span className="material-symbols-outlined text-[24px]">sentiment_satisfied</span>
                  </button>
                  {isEmojiPickerOpen && (
                    <EmojiPickerPopover
                      onSelect={(emoji) => {
                        setDraft((prev) => prev + emoji);
                        textareaRef.current?.focus();
                      }}
                      onClose={() => setIsEmojiPickerOpen(false)}
                    />
                  )}
                </div>
              )}

              {/* Far Right: Normal Send, Locked Send, or Mic Button */}
              {draft.trim() || stagedAttachment?.fileId ? (
                <button
                  type="submit"
                  disabled={sendBusy || stagedAttachment?.uploading}
                  className="w-10 h-10 rounded-full bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white flex items-center justify-center transition-all shrink-0 shadow-sm cursor-pointer"
                  title="Send message"
                >
                  <span className="material-symbols-outlined text-[20px] ml-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                    send
                  </span>
                </button>
              ) : isLockedAudio ? (
                <div className="relative">
                  {/* Floating lock icon without text */}
                  <div className="absolute bottom-12 right-1 flex items-center justify-center w-8 h-8 rounded-full bg-teal-600 text-white shadow-lg animate-in fade-in zoom-in-75 duration-150 z-30">
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                  </div>
                  <button
                    type="button"
                    onClick={stopAndSendAudio}
                    className="w-10 h-10 rounded-full bg-teal-600 hover:bg-teal-700 text-white flex items-center justify-center transition-all shrink-0 shadow-sm cursor-pointer active:scale-95"
                    title="Send voice note"
                  >
                    <span className="material-symbols-outlined text-[20px] ml-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>
                      send
                    </span>
                  </button>
                </div>
              ) : (
                <div className="relative">
                  {/* Floating slide-up-to-lock guide when holding and not yet locked */}
                  {isRecordingAudio && !isLockedAudio && (
                    <div
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        lockAudioRecording();
                      }}
                      onPointerDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        lockAudioRecording();
                      }}
                      onPointerEnter={() => lockAudioRecording()}
                      onMouseEnter={() => lockAudioRecording()}
                      onTouchStart={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        lockAudioRecording();
                      }}
                      className="absolute bottom-12 right-0 flex flex-col items-center gap-1 bg-slate-900/95 text-white text-[11px] font-medium py-2 px-3 rounded-2xl shadow-xl backdrop-blur-xs select-none transition-transform cursor-pointer z-30 hover:bg-slate-800"
                      style={{ transform: `translateY(-${slideUpOffset}px)` }}
                      title="Click or slide up to lock"
                    >
                      <span className={`material-symbols-outlined text-[20px] transition-all ${
                        slideUpOffset >= 15 ? "scale-125 text-teal-400" : "animate-bounce text-slate-200"
                      }`}>
                        {slideUpOffset >= 20 ? "lock" : "lock_open"}
                      </span>
                      <span className="text-[10px] whitespace-nowrap text-slate-200 font-semibold">
                        {slideUpOffset >= 20 ? "Release to lock" : "Slide up to lock"}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    disabled={!activeConversationId || isUploadingAudio}
                    onPointerDown={handleMicPointerDown}
                    className={`w-10 h-10 flex items-center justify-center transition-all shrink-0 rounded-full cursor-pointer select-none ${
                      isRecordingAudio
                        ? "bg-teal-600 text-white shadow-md scale-110"
                        : "text-slate-500 hover:text-teal-600 hover:bg-teal-50 disabled:opacity-40"
                    }`}
                    title={isRecordingAudio ? "Click to send, or slide up to lock" : "Hold and slide up to lock voice recording"}
                  >
                    <span className="material-symbols-outlined text-[24px]">mic</span>
                  </button>
                </div>
              )}
            </div>
          </form>
        </section>

        {/* ── Group Details & Participants Drawer (Slide-Over) ──────────── */}
        {showDetailsDrawer && activeConversation && (
          <aside className="w-full md:w-[320px] lg:w-[360px] border-l border-slate-200 bg-white flex flex-col shrink-0 animate-in slide-in-from-right duration-200 z-20">
            {/* Drawer Header */}
            <div className="p-3.5 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
              <h3 className="font-bold text-slate-800 text-sm">Conversation Details</h3>
              <button
                type="button"
                onClick={() => setShowDetailsDrawer(false)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors"
              >
                <span className="material-symbols-outlined text-[18px] block">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-4">
              {/* Channel / Conversation Card */}
              <div className="flex flex-col items-center text-center p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-teal-500 to-teal-700 text-white flex items-center justify-center font-bold text-xl shadow-xs mb-2">
                  {activeConversation.type === "GROUP"
                    ? "G"
                    : chatUserInitials(getOtherParticipant(activeConversation))}
                </div>
                <h4 className="font-bold text-slate-900 text-base">{channelTitle}</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {activeConversation.type === "GROUP"
                    ? `${activeParticipants.length} active members`
                    : getOtherParticipant(activeConversation)?.email || "Direct Message"}
                </p>
                {activeConversation.description && (
                  <p className="text-xs text-slate-600 mt-2 bg-white p-2 rounded-md border border-slate-100 w-full text-left">
                    {activeConversation.description}
                  </p>
                )}
              </div>

              {/* Notification Mute Switch */}
              <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200">
                <div className="flex items-center gap-2.5">
                  <span className={`material-symbols-outlined text-[20px] ${isMuted ? "text-slate-400" : "text-teal-600"}`}>
                    {isMuted ? "notifications_off" : "notifications"}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-slate-800">Mute Notifications</p>
                    <p className="text-[11px] text-slate-400">Silence popups and alerts</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleToggleMute}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    isMuted ? "bg-teal-600" : "bg-slate-200"
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                      isMuted ? "translate-x-4" : "translate-x-0"
                    }`}
                  />
                </button>
              </div>

              {/* Drawer Tabs: Members vs Shared Media */}
              <div className="flex border-b border-slate-200 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setDrawerTab("members")}
                  className={`flex-1 py-2 text-center border-b-2 transition-colors ${
                    drawerTab === "members"
                      ? "border-teal-600 text-teal-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Members ({activeParticipants.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDrawerTab("media")}
                  className={`flex-1 py-2 text-center border-b-2 transition-colors ${
                    drawerTab === "media"
                      ? "border-teal-600 text-teal-700"
                      : "border-transparent text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Shared Files ({sharedAttachments.length})
                </button>
              </div>

              {/* TAB 1: MEMBERS */}
              {drawerTab === "members" && (
                <div className="space-y-3">
                  {/* Add Member button (for Groups) */}
                  {activeConversation.type === "GROUP" && (
                    <div className="space-y-2">
                      {!showAddMember ? (
                        <button
                          type="button"
                          onClick={() => setShowAddMember(true)}
                          className="w-full py-2 px-3 border border-dashed border-teal-300 rounded-lg text-xs font-semibold text-teal-700 hover:bg-teal-50 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <span className="material-symbols-outlined text-[16px]">person_add</span>
                          Add Colleague to Group
                        </button>
                      ) : (
                        <div className="p-2.5 rounded-lg border border-teal-200 bg-teal-50/50 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-teal-900">Add Member</span>
                            <button
                              type="button"
                              onClick={() => {
                                setShowAddMember(false);
                                setAddMemberFilter("");
                              }}
                              className="text-slate-400 hover:text-slate-600"
                            >
                              <span className="material-symbols-outlined text-[14px]">close</span>
                            </button>
                          </div>
                          <input
                            type="text"
                            value={addMemberFilter}
                            onChange={(e) => setAddMemberFilter(e.target.value)}
                            placeholder="Search colleagues..."
                            className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-teal-500"
                          />
                          <div className="max-h-36 overflow-y-auto space-y-1 custom-scrollbar">
                            {colleagues
                              .filter(
                                (c) =>
                                  !activeParticipants.some((p) => p.userId === c.id) &&
                                  (chatUserLabel(c).toLowerCase().includes(addMemberFilter.toLowerCase()) ||
                                    (c.email || "").toLowerCase().includes(addMemberFilter.toLowerCase()))
                              )
                              .map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  onClick={() => handleAddMember(c.id)}
                                  className="w-full text-left px-2 py-1.5 rounded hover:bg-white flex items-center justify-between text-xs text-slate-800 transition-colors"
                                >
                                  <span className="truncate font-medium">{chatUserLabel(c)}</span>
                                  <span className="text-[11px] text-teal-600 font-semibold shrink-0 ml-1">Add +</span>
                                </button>
                              ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Participant List */}
                  <div className="space-y-1">
                    {activeParticipants.map((p) => {
                      const isSelf = p.userId === myId;
                      const u = p.user;
                      const isOwnerRole = p.role === "OWNER";
                      const isAdminRole = p.role === "ADMIN";

                      return (
                        <div
                          key={p.userId}
                          className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-50 transition-colors group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="relative w-8 h-8 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center text-xs font-bold shrink-0">
                              {chatUserInitials(u)}
                              <span
                                className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white ${
                                  onlineUsers.has(p.userId) ? "bg-green-500" : "bg-slate-300"
                                }`}
                              />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">
                                {u ? chatUserLabel(u) : "Colleague"} {isSelf && <span className="text-slate-400 font-normal">(You)</span>}
                              </p>
                              <p className="text-[10px] text-slate-400 truncate">{u?.email || u?.username || "Staff"}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0 ml-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                isOwnerRole
                                  ? "bg-amber-100 text-amber-800"
                                  : isAdminRole
                                  ? "bg-teal-100 text-teal-800"
                                  : "bg-slate-100 text-slate-600"
                              }`}
                            >
                              {p.role}
                            </span>

                            {/* Remove / Leave action */}
                            {activeConversation.type === "GROUP" && !isOwnerRole && (
                              <button
                                type="button"
                                onClick={() => handleRemoveMember(p.userId)}
                                className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-600 rounded transition-opacity"
                                title={isSelf ? "Leave group" : "Remove member"}
                              >
                                <span className="material-symbols-outlined text-[15px] block">
                                  {isSelf ? "logout" : "person_remove"}
                                </span>
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TAB 2: SHARED MEDIA */}
              {drawerTab === "media" && (
                <div className="space-y-3">
                  {sharedAttachments.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-6 bg-slate-50 rounded-lg">
                      No files or media shared yet.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {sharedAttachments.map((att, i) => {
                        const isImg = att.mimeType?.startsWith("image/");
                        return (
                          <div
                            key={i}
                            className="flex items-center justify-between p-2 rounded-lg border border-slate-100 hover:border-slate-200 bg-slate-50/50 hover:bg-slate-50 transition-colors"
                          >
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div
                                onClick={() => {
                                  if (isImg) {
                                    setLightboxMedia({
                                      src: `/api/v1/files/${att.fileId}/download`,
                                      title: att.fileName,
                                      fileId: att.fileId,
                                    });
                                  }
                                }}
                                className={`w-9 h-9 rounded-md flex items-center justify-center shrink-0 cursor-pointer ${
                                  isImg ? "bg-teal-600 text-white" : "bg-slate-200 text-slate-700"
                                }`}
                              >
                                <span className="material-symbols-outlined text-[18px]">
                                  {isImg ? "image" : "description"}
                                </span>
                              </div>
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-slate-800 truncate" title={att.fileName}>
                                  {att.fileName}
                                </p>
                                <p className="text-[10px] text-slate-400">
                                  {att.sizeBytes / (1024 * 1024) < 1
                                    ? `${(att.sizeBytes / 1024).toFixed(1)} KB`
                                    : `${(att.sizeBytes / (1024 * 1024)).toFixed(1)} MB`}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => downloadFile(att.fileId, att.fileName)}
                              className="p-1.5 text-slate-400 hover:text-teal-600 rounded-full hover:bg-slate-200/60 transition-colors shrink-0 ml-1"
                              title="Download file"
                            >
                              <span className="material-symbols-outlined text-[16px] block">download</span>
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* ── New Group Channel Modal ─────────────────────────────────────── */}
      {isNewGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 max-w-md w-full flex flex-col max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-teal-600 text-[22px]">group_add</span>
                <h3 className="font-bold text-slate-900 text-base">Create Group Channel</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsNewGroupModalOpen(false);
                  setGroupTitle("");
                  setGroupDesc("");
                  setSelectedColleagues(new Set());
                }}
                className="text-slate-400 hover:text-slate-700"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateGroup} className="flex-1 overflow-y-auto custom-scrollbar p-5 space-y-4">
              {createGroupError && (
                <div className="p-2.5 rounded-lg bg-red-50 text-red-700 border border-red-200 text-xs">
                  {createGroupError}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Channel Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={groupTitle}
                  onChange={(e) => setGroupTitle(e.target.value)}
                  placeholder="e.g. Case Coordination Squad"
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Description (Optional)
                </label>
                <input
                  type="text"
                  value={groupDesc}
                  onChange={(e) => setGroupDesc(e.target.value)}
                  placeholder="What is this channel for?"
                  className="w-full text-sm px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Select Members ({selectedColleagues.size} selected)
                  </label>
                </div>

                {/* Colleague filter search */}
                <input
                  type="text"
                  value={groupColleagueFilter}
                  onChange={(e) => setGroupColleagueFilter(e.target.value)}
                  placeholder="Filter colleagues by name or email..."
                  className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 mb-2"
                />

                {/* Selected chips bar */}
                {selectedColleagues.size > 0 && (
                  <div className="flex flex-wrap gap-1.5 mb-2.5 max-h-20 overflow-y-auto p-1">
                    {Array.from(selectedColleagues).map((id) => {
                      const u = colleagues.find((c) => c.id === id);
                      return (
                        <span
                          key={id}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-teal-100 text-teal-800"
                        >
                          {u ? chatUserLabel(u) : "Colleague"}
                          <button
                            type="button"
                            onClick={() => {
                              const next = new Set(selectedColleagues);
                              next.delete(id);
                              setSelectedColleagues(next);
                            }}
                            className="hover:text-teal-950"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}

                {/* Colleagues checkbox list */}
                <div className="max-h-44 overflow-y-auto border border-slate-200 rounded-lg divide-y divide-slate-100 custom-scrollbar">
                  {colleagues
                    .filter(
                      (c) =>
                        chatUserLabel(c).toLowerCase().includes(groupColleagueFilter.toLowerCase()) ||
                        (c.email || "").toLowerCase().includes(groupColleagueFilter.toLowerCase())
                    )
                    .map((c) => {
                      const checked = selectedColleagues.has(c.id);
                      return (
                        <label
                          key={c.id}
                          className="flex items-center gap-3 p-2 hover:bg-slate-50 cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              const next = new Set(selectedColleagues);
                              if (checked) next.delete(c.id);
                              else next.add(c.id);
                              setSelectedColleagues(next);
                            }}
                            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500 w-4 h-4"
                          />
                          <div className="relative w-7 h-7 rounded-full bg-teal-100 text-teal-800 font-bold text-xs flex items-center justify-center shrink-0">
                            {chatUserInitials(c)}
                            <span
                              className={`absolute bottom-0 right-0 w-2 h-2 rounded-full border border-white ${
                                onlineUsers.has(c.id) ? "bg-green-500" : "bg-slate-300"
                              }`}
                            />
                          </div>
                          <div className="flex-1 min-w-0 text-xs">
                            <p className="font-semibold text-slate-800 truncate">{chatUserLabel(c)}</p>
                            <p className="text-[11px] text-slate-400 truncate">{c.email || "Staff"}</p>
                          </div>
                        </label>
                      );
                    })}
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsNewGroupModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!groupTitle.trim() || selectedColleagues.size === 0 || createGroupBusy}
                  className="px-4 py-2 rounded-lg text-xs font-semibold bg-teal-600 hover:bg-teal-700 text-white disabled:opacity-50 transition-colors shadow-xs flex items-center gap-1.5"
                >
                  {createGroupBusy ? (
                    <>
                      <span className="material-symbols-outlined text-[16px] animate-spin">progress_activity</span>
                      Creating...
                    </>
                  ) : (
                    "Create Channel"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
