import { supabase } from "../supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type CallType = "audio" | "video";

export interface CallSignal {
  type: "offer" | "answer" | "reject" | "hangup" | "busy";
  callerId: string;
  callerName: string;
  callerAvatar: string | null;
  calleeId: string;
  calleeName: string;
  conversationId: string;
  callType: CallType;
  roomName: string;
  timestamp: string;
}

function callChannelName(userId: string) {
  return `calls:${userId}`;
}

/** Room name is deterministic for a conversation so both sides join the same room. */
export function getCallRoomName(conversationId: string) {
  return `truechats-call-${conversationId}`;
}

/**
 * Return a valid Supabase access token, refreshing the session first if the
 * cached token is expired or close to expiring. Supabase's auto-refresh runs
 * on a background timer, so a long-idle tab can still hold a stale token
 * when the user finally picks up a call — hitting /api/livekit/token with a
 * stale Bearer ends up as a 401 server-side.
 */
async function getFreshAccessToken(): Promise<string | null> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return null;

  const expiresAtMs = session.expires_at ? session.expires_at * 1000 : 0;
  const isExpiringSoon = !expiresAtMs || expiresAtMs < Date.now() + 60_000;

  if (!isExpiringSoon) return session.access_token;

  const { data: refreshed, error } = await supabase.auth.refreshSession();
  if (error || !refreshed.session) return null;
  return refreshed.session.access_token;
}

export async function getLiveKitToken(
  roomName: string,
  participantName: string,
  avatarUrl?: string | null,
): Promise<string> {
  const accessToken = await getFreshAccessToken();
  if (!accessToken) {
    throw new Error("Not authenticated");
  }

  const res = await fetch("/api/livekit/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ roomName, participantName, avatarUrl: avatarUrl ?? null }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Failed to get LiveKit token");
  }
  const { token } = await res.json();
  return token;
}

/**
 * Subscribe to incoming call signals for the current user.
 * Returns the channel (call `.unsubscribe()` on cleanup).
 */
export function subscribeToCallSignals(
  userId: string,
  onSignal: (signal: CallSignal) => void,
): RealtimeChannel {
  const channel = supabase.channel(callChannelName(userId));

  channel
    .on("broadcast", { event: "call-signal" }, (payload) => {
      onSignal(payload.payload as CallSignal);
    })
    .subscribe();

  return channel;
}

/** Send a call signal to another user. */
export async function sendCallSignal(
  targetUserId: string,
  signal: CallSignal,
) {
  const channel = supabase.channel(callChannelName(targetUserId));

  await new Promise<void>((resolve) => {
    channel.subscribe((status) => {
      if (status === "SUBSCRIBED") resolve();
    });
  });

  await channel.send({
    type: "broadcast",
    event: "call-signal",
    payload: signal,
  });

  supabase.removeChannel(channel);
}
