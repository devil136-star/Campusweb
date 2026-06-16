"use client";

import { useState } from "react";
import { Channel, Conversation, User } from "@/lib/api";

type ViewMode = "channels" | "dms";

interface ChatSidebarProps {
  mode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
  channels: Channel[];
  discoverChannels: Channel[];
  conversations: Conversation[];
  activeChannelId: string | null;
  activeConversationId: string | null;
  userName: string;
  onSelectChannel: (channelId: string) => void;
  onSelectConversation: (conversationId: string) => void;
  onCreateChannel: (name: string, description: string) => Promise<void>;
  onJoinChannel: (channelId: string) => Promise<void>;
  onStartDm: (user: User) => Promise<void>;
  onSearchUsers: (query: string) => Promise<User[]>;
  onLogout: () => void;
}

export function ChatSidebar({
  mode,
  onModeChange,
  channels,
  discoverChannels,
  conversations,
  activeChannelId,
  activeConversationId,
  userName,
  onSelectChannel,
  onSelectConversation,
  onCreateChannel,
  onJoinChannel,
  onStartDm,
  onSearchUsers,
  onLogout,
}: ChatSidebarProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [creating, setCreating] = useState(false);
  const [dmQuery, setDmQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [searching, setSearching] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      await onCreateChannel(newName, newDesc);
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
    } finally {
      setCreating(false);
    }
  };

  const handleSearch = async (q: string) => {
    setDmQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    try {
      const users = await onSearchUsers(q);
      setSearchResults(users);
    } finally {
      setSearching(false);
    }
  };

  return (
    <aside className="flex h-full w-72 shrink-0 flex-col border-r border-slate-800 bg-slate-900">
      <div className="border-b border-slate-800 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-sm font-bold text-white">
            C
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate font-semibold text-white">CampusWeb</h2>
            <p className="truncate text-xs text-slate-400">{userName}</p>
          </div>
        </div>
        <div className="mt-3 flex rounded-lg bg-slate-800 p-1">
          <button
            onClick={() => onModeChange("channels")}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${
              mode === "channels" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Channels
          </button>
          <button
            onClick={() => onModeChange("dms")}
            className={`flex-1 rounded-md py-1.5 text-xs font-medium transition ${
              mode === "dms" ? "bg-indigo-600 text-white" : "text-slate-400 hover:text-white"
            }`}
          >
            Messages
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {mode === "channels" ? (
          <>
            <div className="mb-2 flex items-center justify-between px-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Your Channels
              </span>
              <button
                onClick={() => setShowCreate(!showCreate)}
                className="rounded p-1 text-slate-400 transition hover:bg-slate-800 hover:text-white"
                title="Create channel"
              >
                +
              </button>
            </div>

            {showCreate && (
              <form onSubmit={handleCreate} className="mb-3 space-y-2 rounded-lg bg-slate-800 p-3">
                <input
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="channel-name"
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white outline-none focus:border-indigo-500"
                  required
                />
                <input
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Description (optional)"
                  className="w-full rounded border border-slate-700 bg-slate-900 px-2 py-1.5 text-sm text-white outline-none focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={creating}
                  className="w-full rounded bg-indigo-600 py-1.5 text-sm text-white hover:bg-indigo-500 disabled:opacity-50"
                >
                  {creating ? "Creating..." : "Create"}
                </button>
              </form>
            )}

            <nav className="space-y-0.5">
              {channels.map((channel) => (
                <button
                  key={channel.id}
                  onClick={() => onSelectChannel(channel.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                    activeChannelId === channel.id
                      ? "bg-indigo-600/20 text-indigo-300"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span className="text-slate-500">#</span>
                  <span className="truncate">{channel.name}</span>
                </button>
              ))}
            </nav>

            {discoverChannels.length > 0 && (
              <>
                <div className="mb-2 mt-6 px-2">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Discover
                  </span>
                </div>
                <nav className="space-y-0.5">
                  {discoverChannels.map((channel) => (
                    <div
                      key={channel.id}
                      className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-slate-800"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm text-slate-300">#{channel.name}</p>
                        <p className="truncate text-xs text-slate-500">
                          {channel.memberCount} members
                        </p>
                      </div>
                      <button
                        onClick={() => onJoinChannel(channel.id)}
                        className="shrink-0 rounded bg-slate-700 px-2 py-1 text-xs text-white hover:bg-indigo-600"
                      >
                        Join
                      </button>
                    </div>
                  ))}
                </nav>
              </>
            )}
          </>
        ) : (
          <>
            <div className="mb-3 px-2">
              <input
                value={dmQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search students..."
                className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white outline-none focus:border-indigo-500"
              />
            </div>

            {searching && <p className="px-2 text-xs text-slate-500">Searching...</p>}

            {searchResults.length > 0 && (
              <nav className="mb-4 space-y-0.5">
                {searchResults.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => {
                      onStartDm(user);
                      setDmQuery("");
                      setSearchResults([]);
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm text-slate-300 hover:bg-slate-800 hover:text-white"
                  >
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-700 text-xs">
                      {user.name.charAt(0)}
                    </span>
                    <span className="truncate">{user.name}</span>
                  </button>
                ))}
              </nav>
            )}

            <div className="mb-2 px-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Direct Messages
              </span>
            </div>
            <nav className="space-y-0.5">
              {conversations.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => onSelectConversation(conv.id)}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition ${
                    activeConversationId === conv.id
                      ? "bg-indigo-600/20 text-indigo-300"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-slate-700 text-xs">
                    {conv.otherUser?.name.charAt(0) ?? "?"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate">{conv.otherUser?.name ?? "Unknown"}</p>
                    {conv.lastMessage && (
                      <p className="truncate text-xs text-slate-500">
                        {conv.lastMessage.content || "📎 Attachment"}
                      </p>
                    )}
                  </div>
                </button>
              ))}
              {conversations.length === 0 && (
                <p className="px-2 text-xs text-slate-500">Search above to start a chat</p>
              )}
            </nav>
          </>
        )}
      </div>

      <div className="border-t border-slate-800 p-3">
        <button
          onClick={onLogout}
          className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-400 transition hover:bg-slate-800 hover:text-white"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
