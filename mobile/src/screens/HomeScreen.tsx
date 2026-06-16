import { useCallback, useEffect, useState } from "react";
import {
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { api, attachmentFullUrl, Channel, Conversation, Message, User } from "../lib/api";
import { getSocket } from "../lib/socket";

type Tab = "channels" | "dms";

interface HomeScreenProps {
  token: string;
  user: User;
  onLogout: () => void;
}

export function HomeScreen({ token, user, onLogout }: HomeScreenProps) {
  const [tab, setTab] = useState<Tab>("channels");
  const [channels, setChannels] = useState<Channel[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [search, setSearch] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);

  const activeChannel = channels.find((c) => c.id === activeChannelId);
  const activeConv = conversations.find((c) => c.id === activeConversationId);

  const loadChannels = useCallback(async () => {
    const { channels: list } = await api.getChannels(token);
    setChannels(list);
    if (!activeChannelId && list.length > 0) setActiveChannelId(list[0].id);
  }, [token, activeChannelId]);

  const loadConversations = useCallback(async () => {
    const { conversations: list } = await api.getConversations(token);
    setConversations(list);
  }, [token]);

  useEffect(() => {
    loadChannels();
    loadConversations();
  }, [loadChannels, loadConversations]);

  useEffect(() => {
    if (!activeChannelId || tab !== "channels") return;
    api.getMessages(token, activeChannelId).then(({ messages: m }) => setMessages(m));
    const socket = getSocket();
    socket?.emit("join_channel", activeChannelId);
    const handler = ({ message }: { message: Message }) => {
      if (message.channelId === activeChannelId) {
        setMessages((prev) => (prev.some((x) => x.id === message.id) ? prev : [...prev, message]));
      }
    };
    socket?.on("new_message", handler);
    return () => {
      socket?.off("new_message", handler);
      socket?.emit("leave_channel", activeChannelId);
    };
  }, [token, activeChannelId, tab]);

  useEffect(() => {
    if (!activeConversationId || tab !== "dms") return;
    api.getDmMessages(token, activeConversationId).then(({ messages: m }) =>
      setMessages(
        m.map((msg) => ({
          ...msg,
          channelId: msg.conversationId ?? activeConversationId,
        }))
      )
    );
    const socket = getSocket();
    socket?.emit("join_dm", activeConversationId);
    const handler = ({ message }: { message: Message & { conversationId: string } }) => {
      if (message.conversationId === activeConversationId) {
        setMessages((prev) =>
          prev.some((x) => x.id === message.id)
            ? prev
            : [...prev, { ...message, channelId: message.conversationId }]
        );
      }
    };
    socket?.on("new_dm_message", handler);
    return () => {
      socket?.off("new_dm_message", handler);
      socket?.emit("leave_dm", activeConversationId);
    };
  }, [token, activeConversationId, tab]);

  const send = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    const socket = getSocket();
    if (tab === "channels" && activeChannelId) {
      socket?.emit("send_message", { channelId: activeChannelId, content: trimmed });
    } else if (tab === "dms" && activeConversationId) {
      socket?.emit("send_dm", { conversationId: activeConversationId, content: trimmed });
    }
    setInput("");
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.8,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    const attachment = await api.uploadFile(
      token,
      asset.uri,
      asset.fileName ?? "image.jpg",
      asset.mimeType ?? "image/jpeg"
    );
    const socket = getSocket();
    if (tab === "channels" && activeChannelId) {
      socket?.emit("send_message", {
        channelId: activeChannelId,
        content: "",
        attachmentUrl: attachment.url,
        attachmentType: attachment.type,
        attachmentName: attachment.name,
      });
    } else if (tab === "dms" && activeConversationId) {
      socket?.emit("send_dm", {
        conversationId: activeConversationId,
        content: "",
        attachmentUrl: attachment.url,
        attachmentType: attachment.type,
        attachmentName: attachment.name,
      });
    }
  };

  const searchUsers = async (q: string) => {
    setSearch(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const { users } = await api.searchUsers(token, q);
    setSearchResults(users);
  };

  const startDm = async (other: User) => {
    const { conversation } = await api.startConversation(token, other.id);
    await loadConversations();
    setTab("dms");
    setActiveConversationId(conversation.id);
    setSearch("");
    setSearchResults([]);
  };

  const title =
    tab === "channels"
      ? activeChannel
        ? `#${activeChannel.name}`
        : "Channels"
      : activeConv?.otherUser?.name ?? "Messages";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>{title}</Text>
        <Pressable onPress={onLogout}>
          <Text style={styles.logout}>Sign out</Text>
        </Pressable>
      </View>

      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, tab === "channels" && styles.tabActive]}
          onPress={() => setTab("channels")}
        >
          <Text style={styles.tabText}>Channels</Text>
        </Pressable>
        <Pressable
          style={[styles.tab, tab === "dms" && styles.tabActive]}
          onPress={() => setTab("dms")}
        >
          <Text style={styles.tabText}>DMs</Text>
        </Pressable>
      </View>

      {tab === "channels" ? (
        <FlatList
          horizontal
          data={channels}
          keyExtractor={(item) => item.id}
          style={styles.channelList}
          renderItem={({ item }) => (
            <Pressable
              style={[styles.channelChip, activeChannelId === item.id && styles.channelChipActive]}
              onPress={() => setActiveChannelId(item.id)}
            >
              <Text style={styles.channelChipText}>#{item.name}</Text>
            </Pressable>
          )}
        />
      ) : (
        <View>
          <TextInput
            style={styles.search}
            placeholder="Search students..."
            placeholderTextColor="#64748b"
            value={search}
            onChangeText={searchUsers}
          />
          {searchResults.map((u) => (
            <Pressable key={u.id} style={styles.searchResult} onPress={() => startDm(u)}>
              <Text style={styles.searchResultText}>{u.name}</Text>
            </Pressable>
          ))}
          <FlatList
            horizontal
            data={conversations}
            keyExtractor={(item) => item.id}
            style={styles.channelList}
            renderItem={({ item }) => (
              <Pressable
                style={[
                  styles.channelChip,
                  activeConversationId === item.id && styles.channelChipActive,
                ]}
                onPress={() => setActiveConversationId(item.id)}
              >
                <Text style={styles.channelChipText}>{item.otherUser?.name ?? "?"}</Text>
              </Pressable>
            )}
          />
        </View>
      )}

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        style={styles.messages}
        contentContainerStyle={{ padding: 16, gap: 12 }}
        renderItem={({ item }) => {
          const isOwn = item.userId === user.id;
          return (
            <View style={[styles.bubbleRow, isOwn && styles.bubbleRowOwn]}>
              <View style={[styles.bubble, isOwn ? styles.bubbleOwn : styles.bubbleOther]}>
                {!isOwn && <Text style={styles.sender}>{item.user.name}</Text>}
                {item.attachmentUrl && item.attachmentType?.startsWith("image/") ? (
                  <Image
                    source={{ uri: attachmentFullUrl(item.attachmentUrl) }}
                    style={styles.image}
                  />
                ) : item.attachmentUrl ? (
                  <Text style={styles.attachment}>📎 {item.attachmentName}</Text>
                ) : null}
                {item.content ? (
                  <Text style={[styles.bubbleText, isOwn && styles.bubbleTextOwn]}>
                    {item.content}
                  </Text>
                ) : null}
              </View>
            </View>
          );
        }}
      />

      <View style={styles.inputRow}>
        <Pressable style={styles.attachBtn} onPress={pickImage}>
          <Text>📎</Text>
        </Pressable>
        <TextInput
          style={styles.input}
          placeholder="Message..."
          placeholderTextColor="#64748b"
          value={input}
          onChangeText={setInput}
        />
        <Pressable style={styles.sendBtn} onPress={send}>
          <Text style={styles.sendText}>Send</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#020617" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    paddingTop: 48,
    borderBottomWidth: 1,
    borderBottomColor: "#1e293b",
  },
  headerTitle: { color: "#fff", fontSize: 18, fontWeight: "700" },
  logout: { color: "#94a3b8" },
  tabs: { flexDirection: "row", padding: 12, gap: 8 },
  tab: { flex: 1, padding: 10, borderRadius: 8, backgroundColor: "#1e293b", alignItems: "center" },
  tabActive: { backgroundColor: "#4f46e5" },
  tabText: { color: "#fff", fontWeight: "600" },
  channelList: { maxHeight: 48, paddingHorizontal: 12 },
  channelChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#1e293b",
    marginRight: 8,
  },
  channelChipActive: { backgroundColor: "#312e81" },
  channelChipText: { color: "#e2e8f0" },
  search: {
    marginHorizontal: 12,
    marginBottom: 8,
    backgroundColor: "#1e293b",
    borderRadius: 10,
    padding: 12,
    color: "#fff",
  },
  searchResult: { paddingHorizontal: 16, paddingVertical: 10 },
  searchResultText: { color: "#cbd5e1" },
  messages: { flex: 1 },
  bubbleRow: { alignItems: "flex-start" },
  bubbleRowOwn: { alignItems: "flex-end" },
  bubble: { maxWidth: "80%", borderRadius: 16, padding: 12 },
  bubbleOwn: { backgroundColor: "#4f46e5" },
  bubbleOther: { backgroundColor: "#1e293b" },
  sender: { color: "#94a3b8", fontSize: 12, marginBottom: 4 },
  bubbleText: { color: "#e2e8f0" },
  bubbleTextOwn: { color: "#fff" },
  image: { width: 200, height: 200, borderRadius: 8, marginBottom: 4 },
  attachment: { color: "#c7d2fe", marginBottom: 4 },
  inputRow: {
    flexDirection: "row",
    padding: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#1e293b",
  },
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#1e293b",
    alignItems: "center",
    justifyContent: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "#1e293b",
    borderRadius: 10,
    paddingHorizontal: 14,
    color: "#fff",
  },
  sendBtn: {
    backgroundColor: "#4f46e5",
    borderRadius: 10,
    paddingHorizontal: 16,
    justifyContent: "center",
  },
  sendText: { color: "#fff", fontWeight: "600" },
});
