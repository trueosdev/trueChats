"use client";

import { useEffect, useMemo, useRef } from "react";
import { supabase } from "@/lib/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import useChatStore from "@/hooks/useChatStore";

/**
 * Shape exposed by `apps/www/electron/preload.js`. We duck-type it rather than
 * importing a .d.ts so web builds (without Electron) compile unchanged.
 */
type ElectronAPI = {
  platform?: string;
  notify?: (options: {
    title?: string;
    subtitle?: string;
    body?: string;
    silent?: boolean;
  }) => Promise<unknown>;
  setBadgeCount?: (count: number) => Promise<unknown>;
  bounceDock?: (type?: "informational" | "critical") => Promise<unknown>;
};

function getElectronAPI(): ElectronAPI | null {
  if (typeof window === "undefined") return null;
  const api = (window as unknown as { electronAPI?: ElectronAPI }).electronAPI;
  return api ?? null;
}

const IS_MAC =
  typeof window !== "undefined" &&
  (window as unknown as { electronAPI?: ElectronAPI }).electronAPI?.platform ===
    "darwin";

/**
 * Truncate long message bodies so the notification renders cleanly on both
 * macOS Notification Center (single-line-ish) and Windows toast popups.
 */
function clip(text: string | null | undefined, max = 180): string {
  const s = (text ?? "").trim();
  if (!s) return "";
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trimEnd()}…`;
}

function previewMessage(msg: {
  content?: string | null;
  attachment_url?: string | null;
  attachment_name?: string | null;
  attachment_type?: string | null;
}): string {
  const text = (msg.content ?? "").trim();
  if (text) return clip(text);
  if (msg.attachment_url) {
    const kind = msg.attachment_type?.startsWith("image/")
      ? "an image"
      : msg.attachment_name
        ? msg.attachment_name
        : "an attachment";
    return `Sent ${kind}`;
  }
  return "";
}

/**
 * Listens for new DM and Loom/Thread messages and surfaces them as native
 * Electron notifications on macOS/Windows. Silently no-ops in the browser
 * build (no `window.electronAPI.notify`).
 *
 * Suppression rules: never notify for your own messages, and skip when the
 * window is focused AND the corresponding chat is already open in the UI.
 *
 * macOS-specific polish:
 *   - Uses the native `subtitle` field for `Loom › Thread` context (sharper
 *     typography than jamming it into the body).
 *   - Plays the default "new message" system sound.
 *   - Bounces the dock icon (informational) when you're not looking.
 *   - Maintains a dock badge count driven by the chat store's unread counts.
 */
export function useDesktopNotifications() {
  const { user } = useAuth();

  const selectedConversationId = useChatStore((s) => s.selectedConversationId);
  const selectedThreadId = useChatStore((s) => s.selectedThreadId);
  const conversations = useChatStore((s) => s.conversations);
  const unreadCounts = useChatStore((s) => s.unreadCounts);
  const loomUnreadCounts = useChatStore((s) => s.loomUnreadCounts);

  // Refs let the realtime callbacks read the latest values without re-subscribing.
  const selectedConversationIdRef = useRef(selectedConversationId);
  const selectedThreadIdRef = useRef(selectedThreadId);
  const conversationsRef = useRef(conversations);

  useEffect(() => {
    selectedConversationIdRef.current = selectedConversationId;
  }, [selectedConversationId]);
  useEffect(() => {
    selectedThreadIdRef.current = selectedThreadId;
  }, [selectedThreadId]);
  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

  // --- macOS dock badge: total unread across DMs + Looms ---------------------
  const totalUnread = useMemo(() => {
    const dm = Object.values(unreadCounts).reduce(
      (n, v) => n + (v || 0),
      0,
    );
    const looms = Object.values(loomUnreadCounts).reduce(
      (n, v) => n + (v || 0),
      0,
    );
    return dm + looms;
  }, [unreadCounts, loomUnreadCounts]);

  useEffect(() => {
    const api = getElectronAPI();
    if (!api?.setBadgeCount) return;
    void api.setBadgeCount(totalUnread);
  }, [totalUnread]);

  // Clear the badge on sign-out / unmount.
  useEffect(() => {
    return () => {
      const api = getElectronAPI();
      if (api?.setBadgeCount) void api.setBadgeCount(0);
    };
  }, []);

  // --- Realtime: new-message notifications ----------------------------------
  useEffect(() => {
    if (!user) return;
    const api = getElectronAPI();
    if (!api?.notify) return;

    const notify = (opts: {
      title: string;
      subtitle?: string;
      body: string;
    }) => {
      void api.notify?.(opts);
      // macOS: a single, non-sticky bounce draws the eye without being obnoxious.
      if (IS_MAC && api.bounceDock) void api.bounceDock("informational");
    };

    // Small caches so we don't re-query sender/thread/loom info for every message.
    const senderCache = new Map<string, { name: string }>();
    const threadCache = new Map<
      string,
      { threadName: string; loomName: string }
    >();

    const fetchSender = async (senderId: string): Promise<string> => {
      const cached = senderCache.get(senderId);
      if (cached) return cached.name;
      const { data } = await supabase
        .from("users")
        .select("id, username, fullname")
        .eq("id", senderId)
        .maybeSingle();
      const name =
        (data as { fullname?: string | null; username?: string | null } | null)
          ?.fullname ||
        (data as { fullname?: string | null; username?: string | null } | null)
          ?.username ||
        "Someone";
      senderCache.set(senderId, { name });
      return name;
    };

    const fetchThreadContext = async (
      threadId: string,
    ): Promise<{ threadName: string; loomName: string } | null> => {
      const cached = threadCache.get(threadId);
      if (cached) return cached;
      const { data } = await supabase
        .from("threads")
        .select("name, loom_id, looms:loom_id(name)")
        .eq("id", threadId)
        .maybeSingle();
      if (!data) return null;
      const loomName =
        (data as { looms?: { name?: string | null } | null }).looms?.name ||
        "Loom";
      const threadName =
        (data as { name?: string | null }).name || "thread";
      const ctx = { threadName, loomName };
      threadCache.set(threadId, ctx);
      return ctx;
    };

    const dmChannel = supabase
      .channel(`dm-notify:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        async (payload) => {
          const msg = payload.new as {
            id: string;
            conversation_id: string;
            sender_id: string;
            content: string | null;
            attachment_url?: string | null;
            attachment_name?: string | null;
            attachment_type?: string | null;
          };
          if (!msg || msg.sender_id === user.id) return;

          const isCurrentView =
            document.hasFocus() &&
            selectedConversationIdRef.current === msg.conversation_id;
          if (isCurrentView) return;

          const conv = conversationsRef.current.find(
            (c) => c.id === msg.conversation_id,
          );
          // RLS should prevent seeing conversations we're not in, but fall through
          // to a user lookup if the conversation isn't in the local cache yet.
          const title =
            conv?.other_user?.fullname ||
            conv?.other_user?.username ||
            (await fetchSender(msg.sender_id));

          const body = previewMessage(msg);
          if (!body) return;
          notify({ title, body });
        },
      )
      .subscribe();

    const threadChannel = supabase
      .channel(`thread-notify:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "thread_messages" },
        async (payload) => {
          const msg = payload.new as {
            id: string;
            thread_id: string;
            sender_id: string;
            content: string | null;
            attachment_url?: string | null;
            attachment_name?: string | null;
            attachment_type?: string | null;
          };
          if (!msg || msg.sender_id === user.id) return;

          const isCurrentView =
            document.hasFocus() &&
            selectedThreadIdRef.current === msg.thread_id;
          if (isCurrentView) return;

          const [senderName, ctx] = await Promise.all([
            fetchSender(msg.sender_id),
            fetchThreadContext(msg.thread_id),
          ]);
          if (!ctx) return;

          const preview = previewMessage(msg);
          if (!preview) return;

          const title = senderName;
          if (IS_MAC) {
            // macOS renders subtitle as its own bolder line between title and body —
            // perfect for the loom/thread context without cluttering the message body.
            notify({
              title,
              subtitle: `${ctx.loomName} › ${ctx.threadName}`,
              body: preview,
            });
          } else {
            // Windows/Linux: no subtitle field, so fall back to the `[Loom, Thread]\n<message>` body.
            notify({
              title,
              body: `[${ctx.loomName}, ${ctx.threadName}]\n${preview}`,
            });
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(dmChannel);
      supabase.removeChannel(threadChannel);
    };
  }, [user]);
}
