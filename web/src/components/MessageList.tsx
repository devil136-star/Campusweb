"use client";

import { useEffect, useRef } from "react";
import { Message } from "@/lib/api";
import { AttachmentPreview } from "./AttachmentPreview";

interface MessageListProps {
  messages: Message[];
  currentUserId: string;
  title: string;
  subtitle?: string | null;
  emptyText?: string;
}

function formatTime(dateStr: string) {
  return new Date(dateStr).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function MessageList({
  messages,
  currentUserId,
  title,
  subtitle,
  emptyText = "No messages yet. Say hello!",
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <header className="border-b border-slate-800 px-6 py-4">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        {subtitle && <p className="mt-0.5 text-sm text-slate-400">{subtitle}</p>}
      </header>

      <div className="flex-1 overflow-y-auto px-6 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center">
            <p className="text-slate-500">{emptyText}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => {
              const isOwn = msg.userId === currentUserId;
              const hasAttachment = Boolean(msg.attachmentUrl && msg.attachmentType);
              return (
                <div key={msg.id} className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}>
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-medium ${
                      isOwn ? "bg-indigo-600 text-white" : "bg-slate-700 text-slate-200"
                    }`}
                  >
                    {msg.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className={`max-w-[70%] ${isOwn ? "text-right" : ""}`}>
                    <div className={`mb-1 flex items-baseline gap-2 ${isOwn ? "justify-end" : ""}`}>
                      <span className="text-sm font-medium text-slate-200">
                        {isOwn ? "You" : msg.user.name}
                      </span>
                      <span className="text-xs text-slate-500">{formatTime(msg.createdAt)}</span>
                    </div>
                    <div
                      className={`inline-block rounded-2xl px-4 py-2 text-sm ${
                        isOwn ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-100"
                      }`}
                    >
                      {hasAttachment && (
                        <div className={msg.content ? "mb-2" : ""}>
                          <AttachmentPreview
                            url={msg.attachmentUrl!}
                            type={msg.attachmentType!}
                            name={msg.attachmentName ?? "file"}
                            isOwn={isOwn}
                          />
                        </div>
                      )}
                      {msg.content && <span>{msg.content}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </div>
    </div>
  );
}
