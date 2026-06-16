const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Channel {
  id: string;
  name: string;
  description: string | null;
}

export interface Message {
  id: string;
  content: string;
  channelId: string;
  userId: string;
  createdAt: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  attachmentName?: string | null;
  user: { id: string; name: string };
}

export interface DirectMessage {
  id: string;
  content: string;
  conversationId: string;
  userId: string;
  createdAt: string;
  attachmentUrl?: string | null;
  attachmentType?: string | null;
  attachmentName?: string | null;
  user: { id: string; name: string };
}

export interface Conversation {
  id: string;
  otherUser: User | null;
  lastMessage: DirectMessage | null;
}

class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

async function request<T>(path: string, options: RequestInit = {}, token?: string): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data.error ?? "Request failed", res.status);
  return data as T;
}

export function attachmentFullUrl(url: string): string {
  if (url.startsWith("http")) return url;
  return `${API_URL}${url}`;
}

export const api = {
  login: (email: string, password: string) =>
    request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (email: string, password: string, name: string) =>
    request<{ token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),

  getChannels: (token: string) =>
    request<{ channels: Channel[] }>("/api/channels", {}, token),

  getMessages: (token: string, channelId: string) =>
    request<{ messages: Message[] }>(`/api/messages/${channelId}`, {}, token),

  getConversations: (token: string) =>
    request<{ conversations: Conversation[] }>("/api/dm", {}, token),

  getDmMessages: (token: string, conversationId: string) =>
    request<{ messages: DirectMessage[] }>(`/api/dm/${conversationId}/messages`, {}, token),

  searchUsers: (token: string, query: string) =>
    request<{ users: User[] }>(`/api/users/search?q=${encodeURIComponent(query)}`, {}, token),

  startConversation: (token: string, userId: string) =>
    request<{ conversation: { id: string; otherUser: User } }>("/api/dm", {
      method: "POST",
      body: JSON.stringify({ userId }),
    }, token),

  uploadFile: async (token: string, uri: string, name: string, type: string) => {
    const form = new FormData();
    form.append("file", { uri, name, type } as unknown as Blob);
    const { attachment } = await request<{ attachment: { url: string; type: string; name: string } }>(
      "/api/upload",
      { method: "POST", body: form },
      token
    );
    return attachment;
  },
};

export { ApiError };
