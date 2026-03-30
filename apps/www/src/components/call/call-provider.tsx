"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  subscribeToCallSignals,
  sendCallSignal,
  getCallRoomName,
  getLiveKitToken,
  type CallSignal,
  type CallType,
} from "@/lib/services/calls";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type CallState = "idle" | "outgoing" | "incoming" | "connected";

interface CallContextValue {
  callState: CallState;
  callType: CallType | null;
  remoteUser: { id: string; name: string; avatar: string | null } | null;
  conversationId: string | null;
  livekitToken: string | null;
  livekitUrl: string;
  roomName: string | null;
  startCall: (
    conversationId: string,
    calleeId: string,
    calleeName: string,
    callType: CallType,
  ) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => void;
  hangUp: () => void;
}

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [callState, setCallState] = useState<CallState>("idle");
  const [callType, setCallType] = useState<CallType | null>(null);
  const [remoteUser, setRemoteUser] = useState<{
    id: string;
    name: string;
    avatar: string | null;
  } | null>(null);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);

  const pendingSignalRef = useRef<CallSignal | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";

  const resetCall = useCallback(() => {
    setCallState("idle");
    setCallType(null);
    setRemoteUser(null);
    setConversationId(null);
    setLivekitToken(null);
    setRoomName(null);
    pendingSignalRef.current = null;
  }, []);

  const handleSignal = useCallback(
    (signal: CallSignal) => {
      if (!user) return;

      switch (signal.type) {
        case "offer": {
          if (callState !== "idle") {
            sendCallSignal(signal.callerId, {
              ...signal,
              type: "busy",
              calleeId: signal.callerId,
              callerId: user.id,
              callerName:
                user.user_metadata?.fullname ||
                user.user_metadata?.username ||
                "User",
              callerAvatar: user.user_metadata?.avatar_url || null,
              timestamp: new Date().toISOString(),
            });
            return;
          }
          pendingSignalRef.current = signal;
          setCallState("incoming");
          setCallType(signal.callType);
          setRemoteUser({
            id: signal.callerId,
            name: signal.callerName,
            avatar: signal.callerAvatar,
          });
          setConversationId(signal.conversationId);
          setRoomName(signal.roomName);
          break;
        }
        case "answer": {
          if (callState === "outgoing") {
            setCallState("connected");
          }
          break;
        }
        case "reject":
        case "busy": {
          if (callState === "outgoing") {
            resetCall();
          }
          break;
        }
        case "hangup": {
          resetCall();
          break;
        }
      }
    },
    [user, callState, resetCall],
  );

  useEffect(() => {
    if (!user) return;

    const channel = subscribeToCallSignals(user.id, handleSignal);
    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [user, handleSignal]);

  const startCall = useCallback(
    async (
      targetConversationId: string,
      calleeId: string,
      calleeName: string,
      type: CallType,
    ) => {
      if (!user || callState !== "idle") return;

      const room = getCallRoomName(targetConversationId);
      const displayName =
        user.user_metadata?.fullname ||
        user.user_metadata?.username ||
        "User";

      setCallState("outgoing");
      setCallType(type);
      setRemoteUser({ id: calleeId, name: calleeName, avatar: null });
      setConversationId(targetConversationId);
      setRoomName(room);

      try {
        const token = await getLiveKitToken(room, displayName);
        setLivekitToken(token);

        await sendCallSignal(calleeId, {
          type: "offer",
          callerId: user.id,
          callerName: displayName,
          callerAvatar: user.user_metadata?.avatar_url || null,
          calleeId,
          calleeName,
          conversationId: targetConversationId,
          callType: type,
          roomName: room,
          timestamp: new Date().toISOString(),
        });
      } catch {
        resetCall();
      }
    },
    [user, callState, resetCall],
  );

  const acceptCall = useCallback(async () => {
    if (!user || callState !== "incoming" || !roomName) return;

    const signal = pendingSignalRef.current;
    if (!signal) return;

    const displayName =
      user.user_metadata?.fullname ||
      user.user_metadata?.username ||
      "User";

    try {
      const token = await getLiveKitToken(roomName, displayName);
      setLivekitToken(token);
      setCallState("connected");

      await sendCallSignal(signal.callerId, {
        ...signal,
        type: "answer",
        timestamp: new Date().toISOString(),
      });
    } catch {
      resetCall();
    }
  }, [user, callState, roomName, resetCall]);

  const rejectCall = useCallback(() => {
    if (!user || callState !== "incoming") return;

    const signal = pendingSignalRef.current;
    if (signal) {
      sendCallSignal(signal.callerId, {
        ...signal,
        type: "reject",
        timestamp: new Date().toISOString(),
      });
    }
    resetCall();
  }, [user, callState, resetCall]);

  const hangUp = useCallback(() => {
    if (!user || !remoteUser) return;

    sendCallSignal(remoteUser.id, {
      type: "hangup",
      callerId: user.id,
      callerName: "",
      callerAvatar: null,
      calleeId: remoteUser.id,
      calleeName: remoteUser.name,
      conversationId: conversationId || "",
      callType: callType || "audio",
      roomName: roomName || "",
      timestamp: new Date().toISOString(),
    });
    resetCall();
  }, [user, remoteUser, conversationId, callType, roomName, resetCall]);

  const value = useMemo<CallContextValue>(
    () => ({
      callState,
      callType,
      remoteUser,
      conversationId,
      livekitToken,
      livekitUrl,
      roomName,
      startCall,
      acceptCall,
      rejectCall,
      hangUp,
    }),
    [
      callState,
      callType,
      remoteUser,
      conversationId,
      livekitToken,
      livekitUrl,
      roomName,
      startCall,
      acceptCall,
      rejectCall,
      hangUp,
    ],
  );

  return (
    <CallContext.Provider value={value}>{children}</CallContext.Provider>
  );
}

export function useCall(): CallContextValue {
  const ctx = useContext(CallContext);
  if (!ctx) {
    throw new Error("useCall must be used within CallProvider");
  }
  return ctx;
}
