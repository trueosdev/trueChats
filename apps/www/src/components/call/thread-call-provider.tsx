"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface ThreadCallContextValue {
  threadCallState: "idle" | "connected";
  livekitToken: string | null;
  livekitUrl: string;
  roomName: string | null;
  threadId: string | null;
  threadName: string | null;
  loomId: string | null;
  isMinimized: boolean;
  joinThreadCall: (params: {
    threadId: string;
    threadName: string;
    loomId: string;
    token: string;
    roomName: string;
  }) => void;
  leaveThreadCall: () => void;
  setMinimized: (v: boolean) => void;
  toggleMinimize: () => void;
}

const ThreadCallContext = createContext<ThreadCallContextValue | null>(null);

export function ThreadCallProvider({ children }: { children: ReactNode }) {
  const [threadCallState, setThreadCallState] = useState<"idle" | "connected">(
    "idle",
  );
  const [livekitToken, setLivekitToken] = useState<string | null>(null);
  const [roomName, setRoomName] = useState<string | null>(null);
  const [threadId, setThreadId] = useState<string | null>(null);
  const [threadName, setThreadName] = useState<string | null>(null);
  const [loomId, setLoomId] = useState<string | null>(null);
  const [isMinimized, setMinimized] = useState(false);

  const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || "";

  const threadCallStateRef = useRef(threadCallState);
  threadCallStateRef.current = threadCallState;

  const resetCall = useCallback(() => {
    setThreadCallState("idle");
    setLivekitToken(null);
    setRoomName(null);
    setThreadId(null);
    setThreadName(null);
    setLoomId(null);
    setMinimized(false);
  }, []);

  const joinThreadCall = useCallback(
    (params: {
      threadId: string;
      threadName: string;
      loomId: string;
      token: string;
      roomName: string;
    }) => {
      setThreadId(params.threadId);
      setThreadName(params.threadName);
      setLoomId(params.loomId);
      setLivekitToken(params.token);
      setRoomName(params.roomName);
      setThreadCallState("connected");
      setMinimized(false);
    },
    [],
  );

  const leaveThreadCall = useCallback(() => {
    resetCall();
  }, [resetCall]);

  const toggleMinimize = useCallback(() => {
    setMinimized((v) => !v);
  }, []);

  const value = useMemo<ThreadCallContextValue>(
    () => ({
      threadCallState,
      livekitToken,
      livekitUrl,
      roomName,
      threadId,
      threadName,
      loomId,
      isMinimized,
      joinThreadCall,
      leaveThreadCall,
      setMinimized,
      toggleMinimize,
    }),
    [
      threadCallState,
      livekitToken,
      livekitUrl,
      roomName,
      threadId,
      threadName,
      loomId,
      isMinimized,
      joinThreadCall,
      leaveThreadCall,
      toggleMinimize,
    ],
  );

  return (
    <ThreadCallContext.Provider value={value}>
      {children}
    </ThreadCallContext.Provider>
  );
}

export function useThreadCall(): ThreadCallContextValue {
  const ctx = useContext(ThreadCallContext);
  if (!ctx) {
    throw new Error("useThreadCall must be used within ThreadCallProvider");
  }
  return ctx;
}
