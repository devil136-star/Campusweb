/** Backend URL used for Socket.io and server-side requests. */
export function getApiUrl(): string {
  return process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
}

/** REST base URL — same-origin in the browser (proxied via Next.js rewrites). */
export function getApiBase(): string {
  if (typeof window !== "undefined") return "";
  return getApiUrl();
}
