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

export type CallState = "idle" | "connected" | "incoming";

interface CallContextValue {
  callState: CallState;
  callType: CallType | null;
  remoteUser: { id: string; name: string; avatar: string | null } | null;
  conversationId: string | null;
  livekitToken: string | null;
  livekitUrl: string;
  roomName: string | null;
  isMinimized: boolean;
  startCall: (
    conversationId: string,
    calleeId: string,
    calleeName: string,
    callType: CallType,
  ) => Promise<void>;
  joinCall: () => Promise<void>;
  dismissIncoming: () => void;
  hangUp: () => void;
  toggleMinimize: () => void;
  setMinimized: (v: boolean) => void;
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
  const [isMinimized, setMinimized] = useState(false);

  const pendingSignalRef = useRef<CallSignal | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);

  const callStateRef = useRef(callState);
  callStateRef.current = callState;
  const userRef = useRef(user);
  userRef.current = user;

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";

  const resetCall = useCallback(() => {
    setCallState("idle");
    setCallType(null);
    setRemoteUser(null);
    setConversationId(null);
    setLivekitToken(null);
    setRoomName(null);
    setMinimized(false);
    pendingSignalRef.current = null;
  }, []);

  const resetCallRef = useRef(resetCall);
  resetCallRef.current = resetCall;

  const handleSignal = useCallback((signal: CallSignal) => {
    const currentUser = userRef.current;
    if (!currentUser) return;

    const currentCallState = callStateRef.current;

    switch (signal.type) {
      case "offer": {
        if (currentCallState !== "idle") return;
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
        break;
      }
      case "reject":
      case "busy": {
        break;
      }
      case "hangup": {
        if (currentCallState === "connected") {
          resetCallRef.current();
        }
        if (currentCallState === "incoming") {
          resetCallRef.current();
        }
        break;
      }
    }
  }, []);

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
      if (!user || callStateRef.current !== "idle") return;

      const room = getCallRoomName(targetConversationId);
      const displayName =
        user.user_metadata?.fullname ||
        user.user_metadata?.username ||
        "User";

      setCallType(type);
      setRemoteUser({ id: calleeId, name: calleeName, avatar: null });
      setConversationId(targetConversationId);
      setRoomName(room);
      setMinimized(true);

      try {
        const token = await getLiveKitToken(room, displayName);
        setLivekitToken(token);
        setCallState("connected");

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
    [user, resetCall],
  );

  const joinCall = useCallback(async () => {
    if (!user || callStateRef.current !== "incoming") return;

    const signal = pendingSignalRef.current;
    const currentRoomName = roomName;
    if (!signal || !currentRoomName) return;

    const displayName =
      user.user_metadata?.fullname ||
      user.user_metadata?.username ||
      "User";

    try {
      const token = await getLiveKitToken(currentRoomName, displayName);
      setLivekitToken(token);
      setCallState("connected");
      setMinimized(true);

      await sendCallSignal(signal.callerId, {
        ...signal,
        type: "answer",
        timestamp: new Date().toISOString(),
      });
    } catch {
      resetCall();
    }
  }, [user, roomName, resetCall]);

  const dismissIncoming = useCallback(() => {
    if (callStateRef.current !== "incoming") return;
    resetCall();
  }, [resetCall]);

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

  const toggleMinimize = useCallback(() => {
    setMinimized((v) => !v);
  }, []);

  const value = useMemo<CallContextValue>(
    () => ({
      callState,
      callType,
      remoteUser,
      conversationId,
      livekitToken,
      livekitUrl,
      roomName,
      isMinimized,
      startCall,
      joinCall,
      dismissIncoming,
      hangUp,
      toggleMinimize,
      setMinimized,
    }),
    [
      callState,
      callType,
      remoteUser,
      conversationId,
      livekitToken,
      livekitUrl,
      roomName,
      isMinimized,
      startCall,
      joinCall,
      dismissIncoming,
      hangUp,
      toggleMinimize,
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
