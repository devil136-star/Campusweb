"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api, Channel, Conversation, DirectMessage, Message, User } from "@/lib/api";
import {
  connectSocket,
  joinChannelRoom,
  joinDmRoom,
  type DmUpdatedHandler,
  type NewDmMessageHandler,
  type NewMessageHandler,
} from "@/lib/socket";
import { ChatSidebar } from "@/components/ChatSidebar";
import { MessageList } from "@/components/MessageList";
import { MessageInput, type SendPayload } from "@/components/MessageInput";

type ViewMode = "channels" | "dms";

export default function ChatPage() {
  const { user, token, loading, logout } = useAuth();
  const router = useRouter();

  const [mode, setMode] = useState<ViewMode>("channels");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [discoverChannels, setDiscoverChannels] = useState<Channel[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [channelMessages, setChannelMessages] = useState<Message[]>([]);
  const [dmMessages, setDmMessages] = useState<DirectMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const activeChannel = channels.find((c) => c.id === activeChannelId) ?? null;
  const activeConversation =
    conversations.find((c) => c.id === activeConversationId) ?? null;

  const loadChannels = useCallback(async () => {
    if (!token) return;
    const [joined, discover] = await Promise.all([
      api.getChannels(token),
      api.discoverChannels(token),
    ]);
    setChannels(joined.channels);
    setDiscoverChannels(discover.channels);
    if (mode === "channels" && !activeChannelId && joined.channels.length > 0) {
      setActiveChannelId(joined.channels[0].id);
    }
  }, [token, activeChannelId, mode]);

  const loadConversations = useCallback(async () => {
    if (!token) return;
    const { conversations: convs } = await api.getConversations(token);
    setConversations(convs);
  }, [token]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  useEffect(() => {
    if (token) {
      loadChannels();
      loadConversations();
    }
  }, [token, loadChannels, loadConversations]);

  useEffect(() => {
    if (!token) return;
    const socket = connectSocket(token);

    const onDmUpdated: DmUpdatedHandler = () => loadConversations();
    const onChannelUpdated = () => loadChannels();

    socket.on("dm_updated", onDmUpdated);
    socket.on("channel_updated", onChannelUpdated);
    return () => {
      socket.off("dm_updated", onDmUpdated);
      socket.off("channel_updated", onChannelUpdated);
    };
  }, [token, loadConversations, loadChannels]);

  useEffect(() => {
    if (!token || !activeChannelId || mode !== "channels") return;

    setLoadingMessages(true);
    api
      .getMessages(token, activeChannelId)
      .then(({ messages }) => setChannelMessages(messages))
      .finally(() => setLoadingMessages(false));

    const socket = connectSocket(token);
    const leaveRoom = joinChannelRoom(token, activeChannelId);

    const handler: NewMessageHandler = ({ message }) => {
      if (message.channelId === activeChannelId) {
        setChannelMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    };

    socket.on("new_message", handler);
    return () => {
      socket.off("new_message", handler);
      leaveRoom();
    };
  }, [token, activeChannelId, mode]);

  useEffect(() => {
    if (!token || !activeConversationId || mode !== "dms") return;

    setLoadingMessages(true);
    api
      .getDmMessages(token, activeConversationId)
      .then(({ messages }) => setDmMessages(messages))
      .finally(() => setLoadingMessages(false));

    const socket = connectSocket(token);
    const leaveRoom = joinDmRoom(token, activeConversationId);

    const handler: NewDmMessageHandler = ({ message }) => {
      if (message.conversationId === activeConversationId) {
        setDmMessages((prev) => {
          if (prev.some((m) => m.id === message.id)) return prev;
          return [...prev, message];
        });
      }
    };

    socket.on("new_dm_message", handler);
    return () => {
      socket.off("new_dm_message", handler);
      leaveRoom();
    };
  }, [token, activeConversationId, mode]);

  const handleChannelSend = async (payload: SendPayload) => {
    if (!token || !activeChannelId) return;
    const body = {
      content: payload.content,
      attachmentUrl: payload.attachment?.url,
      attachmentType: payload.attachment?.type,
      attachmentName: payload.attachment?.name,
    };
    const { message } = await api.sendChannelMessage(token, activeChannelId, body);
    setChannelMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
  };

  const handleDmSend = async (payload: SendPayload) => {
    if (!token || !activeConversationId) return;
    const body = {
      content: payload.content,
      attachmentUrl: payload.attachment?.url,
      attachmentType: payload.attachment?.type,
      attachmentName: payload.attachment?.name,
    };
    const { message } = await api.sendDmMessage(token, activeConversationId, body);
    setDmMessages((prev) => {
      if (prev.some((m) => m.id === message.id)) return prev;
      return [...prev, message];
    });
    loadConversations();
  };

  const handleCreateChannel = async (
    name: string,
    description: string,
    options: { isPrivate: boolean; inviteUserIds: string[] }
  ) => {
    if (!token) return;
    const { channel } = await api.createChannel(token, name, description, options);
    await loadChannels();
    setMode("channels");
    setActiveChannelId(channel.id);
  };

  const handleInviteToChannel = async (channelId: string, otherUser: User) => {
    if (!token) return;
    await api.inviteToChannel(token, channelId, otherUser.id);
    await loadChannels();
  };

  const handleJoinChannel = async (channelId: string) => {
    if (!token) return;
    await api.joinChannel(token, channelId);
    await loadChannels();
    setMode("channels");
    setActiveChannelId(channelId);
  };

  const handleStartDm = async (otherUser: User) => {
    if (!token) return;
    const { conversation } = await api.startConversation(token, otherUser.id);
    await loadConversations();
    setMode("dms");
    setActiveConversationId(conversation.id);
  };

  if (loading || !user || !token) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  const dmMessagesAsChannel: Message[] = dmMessages.map((m) => ({
    ...m,
    channelId: m.conversationId,
  }));

  return (
    <div className="flex h-screen bg-slate-950">
      <ChatSidebar
        mode={mode}
        onModeChange={setMode}
        channels={channels}
        discoverChannels={discoverChannels}
        conversations={conversations}
        activeChannelId={activeChannelId}
        activeConversationId={activeConversationId}
        userName={user.name}
        onSelectChannel={(id) => {
          setMode("channels");
          setActiveChannelId(id);
        }}
        onSelectConversation={(id) => {
          setMode("dms");
          setActiveConversationId(id);
        }}
        onCreateChannel={handleCreateChannel}
        onJoinChannel={handleJoinChannel}
        onStartDm={handleStartDm}
        onInviteToChannel={handleInviteToChannel}
        activeChannel={activeChannel}
        onSearchUsers={(q) => api.searchUsers(token, q).then((r) => r.users)}
        onLogout={() => {
          logout();
          router.replace("/login");
        }}
      />

      <main className="flex flex-1 flex-col">
        {mode === "channels" && activeChannel ? (
          <>
            <MessageList
              messages={channelMessages}
              currentUserId={user.id}
              title={`${activeChannel.isPrivate ? "🔒" : "#"}${activeChannel.name}`}
              subtitle={activeChannel.description}
              emptyText={`No messages yet. Say hello to #${activeChannel.name}!`}
            />
            <MessageInput
              onSend={handleChannelSend}
              disabled={loadingMessages}
              token={token}
            />
          </>
        ) : mode === "dms" && activeConversation ? (
          <>
            <MessageList
              messages={dmMessagesAsChannel}
              currentUserId={user.id}
              title={activeConversation.otherUser?.name ?? "Direct Message"}
              subtitle={activeConversation.otherUser?.email}
              emptyText="No messages yet. Start the conversation!"
            />
            <MessageInput onSend={handleDmSend} disabled={loadingMessages} token={token} />
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-slate-500">
            {mode === "dms"
              ? "Search for a student to start a direct message"
              : "Select or create a channel to start chatting"}
          </div>
        )}
      </main>
    </div>
  );
}
