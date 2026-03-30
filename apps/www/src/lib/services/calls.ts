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

export async function getLiveKitToken(
  roomName: string,
  participantName: string,
): Promise<string> {
  const res = await fetch("/api/livekit/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ roomName, participantName }),
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
