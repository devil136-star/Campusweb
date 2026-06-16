import { io, Socket } from "socket.io-client";
import type { DirectMessage, Message } from "./api";

import { getApiUrl } from "./config";

let socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (!socket) {
    socket = io(getApiUrl(), {
      auth: { token },
      autoConnect: false,
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function connectSocket(token: string): Socket {
  const s = getSocket(token);
  if (!s.connected) {
    s.auth = { token };
    s.connect();
  }
  return s;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function joinChannelRoom(token: string, channelId: string): () => void {
  const s = connectSocket(token);
  const join = () => s.emit("join_channel", channelId);
  if (s.connected) join();
  else s.on("connect", join);
  return () => {
    s.off("connect", join);
    s.emit("leave_channel", channelId);
  };
}

export function joinDmRoom(token: string, conversationId: string): () => void {
  const s = connectSocket(token);
  const join = () => s.emit("join_dm", conversationId);
  if (s.connected) join();
  else s.on("connect", join);
  return () => {
    s.off("connect", join);
    s.emit("leave_dm", conversationId);
  };
}

export type NewMessageHandler = (data: { message: Message }) => void;
export type NewDmMessageHandler = (data: { message: DirectMessage }) => void;
export type DmUpdatedHandler = (data: { conversationId: string }) => void;
