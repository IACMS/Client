import { apiGet, apiPost, apiPatch, apiDelete } from './api';

export type ChatUser = {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  username?: string;
};

export type ChatParticipant = {
  userId: string;
  role: 'MEMBER' | 'ADMIN' | 'OWNER';
  user?: ChatUser;
  lastReadMessageId?: string | null;
  lastReadAt?: string | null;
  isMuted?: boolean;
};

export type ChatConversation = {
  id: string;
  type: 'DIRECT' | 'GROUP';
  title?: string | null;
  description?: string | null;
  lastMessageId?: string | null;
  lastMessageAt?: string | null;
  participants: ChatParticipant[];
  unreadCount?: number;
};

export type ChatReaction = {
  emoji: string;
  userId: string;
};

export type ChatReplyPreview = {
  id: string;
  content?: string | null;
  messageType?: string;
  senderId?: string;
  sender?: {
    id?: string;
    firstName?: string;
    lastName?: string;
  };
};

export type ChatAttachment = {
  id?: string;
  fileId: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt?: string;
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  clientMessageId: string;
  messageType: 'TEXT' | 'IMAGE' | 'FILE';
  content?: string | null;
  createdAt: string;
  editedAt?: string | null;
  deletedAt?: string | null;
  replyToId?: string | null;
  replyTo?: ChatReplyPreview | null;
  reactions?: ChatReaction[];
  sender?: ChatUser;
  attachments?: ChatAttachment[];
};

export function chatUserLabel(u: ChatUser | null | undefined): string {
  if (!u) return 'Unknown';
  const name = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim();
  return name || u.email || u.username || 'Unknown';
}

export function chatUserInitials(u: ChatUser | null | undefined): string {
  const label = chatUserLabel(u);
  if (label === 'Unknown') return '?';
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return label.slice(0, 2).toUpperCase();
}

export async function addMessageReaction(conversationId: string, messageId: string, emoji: string) {
  return apiPost(`/api/v1/chat/conversations/${conversationId}/messages/${messageId}/reactions`, { emoji });
}

export async function removeMessageReaction(conversationId: string, messageId: string, emoji: string) {
  return apiDelete(`/api/v1/chat/conversations/${conversationId}/messages/${messageId}/reactions/${encodeURIComponent(emoji)}`);
}

export async function updateMessage(conversationId: string, messageId: string, content: string) {
  return apiPatch(`/api/v1/chat/conversations/${conversationId}/messages/${messageId}`, { content });
}

export async function deleteMessage(conversationId: string, messageId: string) {
  return apiDelete(`/api/v1/chat/conversations/${conversationId}/messages/${messageId}`);
}

export async function createGroupConversation(title: string, participantIds: string[], description?: string) {
  return apiPost('/api/v1/chat/conversations', {
    type: 'GROUP',
    title,
    description: description || undefined,
    participantIds,
  });
}

export async function fetchParticipants(conversationId: string): Promise<{ participants: ChatParticipant[] }> {
  return apiGet(`/api/v1/chat/conversations/${conversationId}/participants`) as Promise<{ participants: ChatParticipant[] }>;
}

export async function addParticipant(conversationId: string, userId: string, role: string = 'MEMBER') {
  return apiPost(`/api/v1/chat/conversations/${conversationId}/participants`, { userId, role });
}

export async function removeParticipant(conversationId: string, userId: string) {
  return apiDelete(`/api/v1/chat/conversations/${conversationId}/participants/${userId}`);
}

export async function toggleMuteConversation(conversationId: string, muted: boolean) {
  return apiPost(`/api/v1/chat/conversations/${conversationId}/participants/mute`, { muted });
}

export async function pinMessage(conversationId: string, messageId: string) {
  return apiPost(`/api/v1/chat/conversations/${conversationId}/pin/${messageId}`, {});
}

export async function unpinMessage(conversationId: string) {
  return apiDelete(`/api/v1/chat/conversations/${conversationId}/pin`);
}

export async function fetchPinnedMessage(conversationId: string): Promise<{ pinnedMessage: ChatMessage | null }> {
  return apiGet(`/api/v1/chat/conversations/${conversationId}/pinned`) as Promise<{ pinnedMessage: ChatMessage | null }>;
}

/**
 * WebSocket client for chat events with heartbeat (pong), auto-reconnect, and outgoing message queueing.
 */
export class ChatWebSocketClient {
  private ws: WebSocket | null = null;
  private messageHandlers: Set<(msg: any) => void> = new Set();
  private subscribedConversations: Set<string> = new Set();
  private sendQueue: any[] = [];
  private manuallyDisconnected = false;
  private reconnectTimer: any = null;
  private reconnectAttempts = 0;
  private url = '';

  constructor(private token: string) {}

  connect(url: string = '') {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.manuallyDisconnected = false;

    if (!url) {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      url = `${protocol}//${window.location.host}/ws`;
    }
    this.url = url;

    try {
      this.ws = new WebSocket(`${url}?token=${this.token}`);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        // 1. Flush queued messages
        while (this.sendQueue.length > 0) {
          const queued = this.sendQueue.shift();
          this.ws?.send(JSON.stringify(queued));
        }
        // 2. Re-subscribe to any active conversations
        this.subscribedConversations.forEach(conversationId => {
          this.ws?.send(JSON.stringify({ action: 'subscribe', conversationId }));
        });
      };

      this.ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          // Auto-respond to heartbeat pings from server
          if (data.type === 'ping') {
            this.send({ action: 'pong' });
            return;
          }
          this.messageHandlers.forEach(h => h(data));
        } catch (e) {
          console.error('[ChatWS] Failed to parse WS message', e);
        }
      };

      this.ws.onclose = () => {
        this.ws = null;
        if (!this.manuallyDisconnected) {
          this.scheduleReconnect();
        }
      };

      this.ws.onerror = (err) => {
        console.warn('[ChatWS] WebSocket error:', err);
      };
    } catch (e) {
      console.error('[ChatWS] Connection error:', e);
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || this.manuallyDisconnected) return;
    const delay = Math.min(1000 * Math.pow(1.5, this.reconnectAttempts), 10000);
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.manuallyDisconnected) {
        this.connect(this.url);
      }
    }, delay);
  }

  subscribeToConversation(conversationId: string) {
    this.subscribedConversations.add(conversationId);
    this.send({ action: 'subscribe', conversationId });
  }

  unsubscribeFromConversation(conversationId: string) {
    this.subscribedConversations.delete(conversationId);
    this.send({ action: 'unsubscribe', conversationId });
  }

  sendTyping(conversationId: string, isTyping: boolean) {
    this.send({ action: 'typing', conversationId, isTyping });
  }

  sendFocus(conversationId: string | null) {
    this.send({ action: 'focus', conversationId });
  }

  onMessage(handler: (msg: any) => void) {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }

  private send(msg: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    } else {
      this.sendQueue.push(msg);
    }
  }

  disconnect() {
    this.manuallyDisconnected = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.sendQueue = [];
    this.subscribedConversations.clear();
    this.ws?.close();
    this.ws = null;
  }
}
