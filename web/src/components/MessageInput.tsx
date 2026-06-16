"use client";

import { FormEvent, useRef, useState } from "react";
import { api, Attachment } from "@/lib/api";

export interface SendPayload {
  content: string;
  attachment?: Attachment;
}

interface MessageInputProps {
  onSend: (payload: SendPayload) => void;
  disabled?: boolean;
  token: string;
}

export function MessageInput({ onSend, disabled, token }: MessageInputProps) {
  const [content, setContent] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pendingFile, setPendingFile] = useState<Attachment | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    try {
      const attachment = await api.uploadFile(token, file);
      setPendingFile(attachment);
    } catch {
      alert("Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = content.trim();
    if ((!trimmed && !pendingFile) || disabled || uploading) return;

    onSend({
      content: trimmed,
      attachment: pendingFile ?? undefined,
    });
    setContent("");
    setPendingFile(null);
  };

  return (
    <form onSubmit={handleSubmit} className="border-t border-slate-800 px-6 py-4">
      {pendingFile && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-sm text-slate-300">
          <span>📎 {pendingFile.name}</span>
          <button
            type="button"
            onClick={() => setPendingFile(null)}
            className="ml-auto text-slate-500 hover:text-white"
          >
            ✕
          </button>
        </div>
      )}
      <div className="flex gap-3">
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/*,.pdf,.txt,.doc,.docx"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || uploading}
          className="rounded-xl border border-slate-700 px-3 py-3 text-slate-400 transition hover:border-indigo-500 hover:text-white disabled:opacity-50"
          title="Attach file"
        >
          {uploading ? "…" : "📎"}
        </button>
        <input
          type="text"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={disabled}
          placeholder="Type a message..."
          className="flex-1 rounded-xl border border-slate-700 bg-slate-800 px-4 py-3 text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={disabled || uploading || (!content.trim() && !pendingFile)}
          className="rounded-xl bg-indigo-600 px-6 py-3 font-medium text-white transition hover:bg-indigo-500 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </form>
  );
}
