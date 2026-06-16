"use client";

import { attachmentFullUrl } from "@/lib/api";

interface AttachmentPreviewProps {
  url: string;
  type: string;
  name: string;
  isOwn?: boolean;
}

export function AttachmentPreview({ url, type, name, isOwn }: AttachmentPreviewProps) {
  const fullUrl = attachmentFullUrl(url);
  const isImage = type.startsWith("image/");

  if (isImage) {
    return (
      <a href={fullUrl} target="_blank" rel="noopener noreferrer" className="block">
        <img
          src={fullUrl}
          alt={name}
          className="max-h-64 max-w-full rounded-lg object-cover"
        />
      </a>
    );
  }

  return (
    <a
      href={fullUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm underline ${
        isOwn ? "text-indigo-100" : "text-indigo-400"
      }`}
    >
      📎 {name}
    </a>
  );
}
