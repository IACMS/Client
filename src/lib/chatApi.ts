export type ChatUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isSelf?: boolean;
};

export type ChatMessage = {
  id: string;
  tenantId: string;
  senderId: string;
  recipientId: string | null;
  body: string;
  createdAt: string;
  sender: ChatUser | null;
  recipient: ChatUser | null;
};

export type ChatChannel = "agency" | "dm";

export function chatUserLabel(u: ChatUser | null | undefined): string {
  if (!u) return "Unknown";
  const name = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return name || u.email;
}

export function chatUserInitials(u: ChatUser | null | undefined): string {
  const label = chatUserLabel(u);
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return label.slice(0, 2).toUpperCase();
}
