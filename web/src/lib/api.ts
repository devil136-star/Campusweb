import { getApiBase, getApiUrl } from "./config";

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Channel {
  id: string;
  name: string;
  description: string | null;
  isPrivate: boolean;
  memberCount: number;
  joinedAt?: string;
}

export interface Attachment {
  url: string;
  type: string;
  name: string;
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
  updatedAt: string;
}

class ApiError extends Error {
  constructor(
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function request<T>(
  path: string,
  options: RequestInit = {},
  token?: string | null
): Promise<T> {
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${getApiBase()}${path}`, { ...options, headers });
  } catch {
    throw new ApiError(
      "Cannot reach the server. Make sure the API is deployed and NEXT_PUBLIC_API_URL is set on Vercel.",
      0
    );
  }

  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new ApiError(data.error ?? "Request failed", res.status);
  }

  return data as T;
}

export function attachmentFullUrl(url: string): string {
  if (url.startsWith("http")) return url;
  const base = typeof window !== "undefined" ? "" : getApiUrl();
  return `${base}${url}`;
}

export const api = {
  register: (email: string, password: string, name: string) =>
    request<{ token: string; user: User }>("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password, name }),
    }),

  login: (email: string, password: string) =>
    request<{ token: string; user: User }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  me: (token: string) =>
    request<{ user: User }>("/api/auth/me", {}, token),

  getChannels: (token: string) =>
    request<{ channels: Channel[] }>("/api/channels", {}, token),

  discoverChannels: (token: string) =>
    request<{ channels: Channel[] }>("/api/channels/discover", {}, token),

  createChannel: (token: string, name: string, description?: string) =>
    request<{ channel: Channel }>("/api/channels", {
      method: "POST",
      body: JSON.stringify({ name, description }),
    }, token),

  joinChannel: (token: string, channelId: string) =>
    request<{ success: boolean }>(`/api/channels/${channelId}/join`, {
      method: "POST",
    }, token),

  getMessages: (token: string, channelId: string) =>
    request<{ messages: Message[] }>(`/api/messages/${channelId}`, {}, token),

  searchUsers: (token: string, query: string) =>
    request<{ users: User[] }>(`/api/users/search?q=${encodeURIComponent(query)}`, {}, token),

  getConversations: (token: string) =>
    request<{ conversations: Conversation[] }>("/api/dm", {}, token),

  startConversation: (token: string, userId: string) =>
    request<{ conversation: { id: string; otherUser: User } }>("/api/dm", {
      method: "POST",
      body: JSON.stringify({ userId }),
    }, token),

  getDmMessages: (token: string, conversationId: string) =>
    request<{ messages: DirectMessage[] }>(`/api/dm/${conversationId}/messages`, {}, token),

  uploadFile: async (token: string, file: File): Promise<Attachment> => {
    const form = new FormData();
    form.append("file", file);
    const { attachment } = await request<{ attachment: Attachment }>(
      "/api/upload",
      { method: "POST", body: form },
      token
    );
    return attachment;
  },
};

export { ApiError };
