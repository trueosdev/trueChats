"use client"

import { useEffect, useRef, useState, useCallback } from 'react'
import { Hash, Lock, Video, PhoneOff, Phone, PhoneCall } from 'lucide-react'
import {
  LiveKitRoom,
  RoomAudioRenderer,
  GridLayout,
  ParticipantTile,
  useTracks,
} from '@livekit/components-react'
import '@livekit/components-styles'
import '@/app/livekit-overrides.css'
import { Track } from 'livekit-client'
import { Button } from '@/components/ui/button'
import { LiveKitLucideControlBar } from '@/components/call/livekit-lucide-control-bar'
import { useThreadCall } from '@/components/call/thread-call-provider'
import { ExpandableChatHeader } from '@shadcn-chat/ui'
import { ChatList } from '../chat/chat-list'
import ChatBottombar from '../chat/chat-bottombar'
import useChatStore from '@/hooks/useChatStore'
import { useAuth } from '@/hooks/useAuth'
import { getThreadMessages, subscribeToThreadMessages, markThreadMessagesAsRead, sendThreadMessage } from '@/lib/services/threads'
import { subscribeToTypingIndicator } from '@/lib/services/presence'
import type { TypingState } from '@/lib/services/presence'
import type { RealtimeChannel } from '@supabase/supabase-js'
import type { Thread, Loom, ConversationWithUser } from '@/app/data'
import type { AttachmentData } from '@/lib/services/attachments'

interface ThreadChatProps {
  thread: Thread
  loom: Loom
  isMobile: boolean
}

export function ThreadChat({ thread, loom, isMobile }: ThreadChatProps) {
  const { user } = useAuth()
  const threadMessages = useChatStore((state) => state.threadMessages)
  const setThreadMessages = useChatStore((state) => state.setThreadMessages)
  const addThreadMessage = useChatStore((state) => state.addThreadMessage)
  const setLoading = useChatStore((state) => state.setLoomLoading)
  const [typingUsers, setTypingUsers] = useState<TypingState[]>([])
  const [typingChannel, setTypingChannel] = useState<RealtimeChannel | null>(null)

  useEffect(() => {
    if (!thread || !user) return

    setLoading(true)
    getThreadMessages(thread.id).then((data) => {
      setThreadMessages(data)
      setLoading(false)
      markThreadMessagesAsRead(thread.id, user.id)
    })

    const unsubscribe = subscribeToThreadMessages(thread.id, (message) => {
      addThreadMessage(message)
      if (message.sender_id !== user.id) {
        markThreadMessagesAsRead(thread.id, user.id)
      }
    })

    const channel = subscribeToTypingIndicator(
      `thread:${thread.id}`,
      user.id,
      (typing) => setTypingUsers(typing)
    )
    setTypingChannel(channel)

    return () => {
      unsubscribe()
      if (channel) channel.unsubscribe()
    }
  }, [thread.id, user?.id])

  const conversationShim: ConversationWithUser = {
    id: thread.id,
    created_at: thread.created_at,
    user1_id: thread.created_by,
    user2_id: thread.created_by,
    is_group: false,
    name: thread.name,
    created_by: thread.created_by,
    last_message: thread.last_message,
  }

  const customSend = async (
    _conversationId: string,
    content: string,
    senderId: string,
    attachment?: AttachmentData,
    replyToId?: string
  ) => {
    const msg = await sendThreadMessage(thread.id, content, senderId, attachment, replyToId)
    if (msg) addThreadMessage(msg)
    return msg
  }

  if (thread.category === 'voice') {
    return <VoiceChannelView thread={thread} loom={loom} />
  }

  return (
    <div className="flex flex-col justify-between w-full h-full">
      <ExpandableChatHeader className="px-2 py-3 sm:px-4">
        <div className="flex items-center gap-3 flex-1">
          <div className="h-8 w-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
            {thread.type === 'private' ? (
              <Lock size={16} className="text-black/60 dark:text-white/60" />
            ) : (
              <Hash size={16} className="text-black/60 dark:text-white/60" />
            )}
          </div>
          <div className="flex flex-col text-left flex-1 min-w-0">
            <span className="font-medium text-sm truncate">{thread.name}</span>
            {thread.description && (
              <span className="text-xs text-muted-foreground truncate">{thread.description}</span>
            )}
          </div>
        </div>
      </ExpandableChatHeader>

      <ChatList
        messages={threadMessages}
        conversation={conversationShim}
        isMobile={isMobile}
        typingUsers={typingUsers}
      />

      <ChatBottombar
        conversationId={thread.id}
        isMobile={isMobile}
        typingChannel={typingChannel}
        customSendMessage={customSend}
      />
    </div>
  )
}

function CallControls({ onLeave }: { onLeave: () => void }) {
  return (
    <div className="livekit-lucide-call-controls flex items-center justify-center gap-3 py-4 shrink-0 overflow-visible">
      <LiveKitLucideControlBar />
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="h-11 w-11 shrink-0 rounded-full bg-red-600 text-white hover:bg-red-700 hover:text-white"
        onClick={onLeave}
      >
        <PhoneOff className="h-5 w-5" />
      </Button>
    </div>
  )
}

function CallGrid() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: false },
  )

  return (
    <div className="flex-1 relative">
      <GridLayout tracks={tracks} style={{ height: '100%' }}>
        <ParticipantTile />
      </GridLayout>
    </div>
  )
}

function VoiceChannelView({ thread, loom }: { thread: Thread; loom: Loom }) {
  const { user, session } = useAuth()
  const threadCall = useThreadCall()
  const [error, setError] = useState<string | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [lobbyParticipantCount, setLobbyParticipantCount] = useState<number | null>(null)
  const [lobbyStatus, setLobbyStatus] = useState<'loading' | 'ready' | 'error'>('loading')

  const roomName = `thread-${thread.id}`

  const isConnectedToThisThread =
    threadCall.threadCallState === 'connected' && threadCall.threadId === thread.id

  const threadCallStateRef = useRef(threadCall.threadCallState)
  threadCallStateRef.current = threadCall.threadCallState
  const threadCallThreadIdRef = useRef(threadCall.threadId)
  threadCallThreadIdRef.current = threadCall.threadId
  const setMinimizedRef = useRef(threadCall.setMinimized)
  setMinimizedRef.current = threadCall.setMinimized

  useEffect(() => {
    if (isConnectedToThisThread) {
      threadCall.setMinimized(false)
    }
  }, [isConnectedToThisThread])

  useEffect(() => {
    const tid = thread.id
    return () => {
      if (
        threadCallStateRef.current === 'connected' &&
        threadCallThreadIdRef.current === tid
      ) {
        setMinimizedRef.current(true)
      }
    }
  }, [thread.id])

  const fetchToken = useCallback(async () => {
    if (!session?.access_token || !user) return null

    const displayName =
      (user as any).user_metadata?.fullname ||
      (user as any).user_metadata?.username ||
      user.email ||
      'Unknown'

    const res = await fetch('/api/livekit/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        roomName,
        participantName: displayName,
      }),
    })

    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body.error || 'Failed to get call token')
    }

    const { token } = await res.json()
    return token as string
  }, [session?.access_token, user, roomName])

  const handleJoin = useCallback(async () => {
    setError(null)
    setConnecting(true)
    try {
      const token = await fetchToken()
      if (!token) {
        setError('Not authenticated. Please sign in again.')
        return
      }
      threadCall.joinThreadCall({
        threadId: thread.id,
        threadName: thread.name,
        loomId: loom.id,
        token,
        roomName,
      })
    } catch (err: any) {
      setError(err.message || 'Failed to join call')
    } finally {
      setConnecting(false)
    }
  }, [fetchToken, threadCall.joinThreadCall, thread.id, thread.name, loom.id, roomName])

  useEffect(() => {
    if (isConnectedToThisThread || !threadCall.livekitUrl) return
    if (!session?.access_token) {
      setLobbyStatus('error')
      setLobbyParticipantCount(null)
      return
    }

    let cancelled = false

    const fetchParticipantCount = async () => {
      setLobbyStatus((s) => (s === 'ready' ? s : 'loading'))
      try {
        const res = await fetch(
          `/api/livekit/room-participants?roomName=${encodeURIComponent(roomName)}`,
          { headers: { Authorization: `Bearer ${session.access_token}` } },
        )
        if (cancelled) return
        if (!res.ok) {
          setLobbyStatus('error')
          setLobbyParticipantCount(null)
          return
        }
        const data = (await res.json()) as { participantCount?: number }
        const n =
          typeof data.participantCount === 'number' ? data.participantCount : 0
        setLobbyParticipantCount(n)
        setLobbyStatus('ready')
      } catch {
        if (!cancelled) {
          setLobbyStatus('error')
          setLobbyParticipantCount(null)
        }
      }
    }

    fetchParticipantCount()
    const interval = setInterval(fetchParticipantCount, 8000)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [isConnectedToThisThread, threadCall.livekitUrl, session?.access_token, roomName])

  const lobbySubtitle =
    lobbyStatus === 'loading' && lobbyParticipantCount === null
      ? "Checking who's in the call…"
      : lobbyStatus === 'error'
        ? 'Join the voice channel to hear others and speak.'
        : lobbyParticipantCount === 0
          ? 'No one is in this call yet'
          : lobbyParticipantCount === 1
            ? '1 person is in the call'
            : `${lobbyParticipantCount} people are in the call`

  if (!threadCall.livekitUrl) {
    return (
      <div className="flex flex-col w-full h-full items-center justify-center p-8">
        <p className="text-sm text-red-600 dark:text-red-400">
          Voice/video calls are not configured. Set <code className="bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded text-xs">NEXT_PUBLIC_LIVEKIT_URL</code> in your environment.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col w-full h-full">
      <div className="px-4 py-3 border-b border-black/10 dark:border-white/10 flex items-center gap-3 shrink-0">
        <div className="h-8 w-8 rounded-lg bg-black/5 dark:bg-white/5 flex items-center justify-center shrink-0">
          <Video size={16} className="text-black/60 dark:text-white/60" />
        </div>
        <div className="flex flex-col text-left flex-1 min-w-0">
          <span className="font-medium text-sm truncate">{thread.name}</span>
          {thread.description && (
            <span className="text-xs text-muted-foreground truncate">{thread.description}</span>
          )}
        </div>
      </div>

      {error && (
        <div className="px-4 pt-3">
          <p className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-4 py-2 rounded-lg">
            {error}
          </p>
        </div>
      )}

      {isConnectedToThisThread && threadCall.livekitToken ? (
        <div className="flex-1 flex flex-col min-h-0" data-lk-theme="default">
          <LiveKitRoom
            serverUrl={threadCall.livekitUrl}
            token={threadCall.livekitToken}
            connect={true}
            audio={true}
            video={false}
            onDisconnected={threadCall.leaveThreadCall}
            style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
          >
            <CallGrid />
            <CallControls onLeave={threadCall.leaveThreadCall} />
            <RoomAudioRenderer />
          </LiveKitRoom>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold text-black dark:text-white">{thread.name}</h3>
            <p className="text-sm text-black/50 dark:text-white/50">{lobbySubtitle}</p>
          </div>
          <button
            onClick={handleJoin}
            disabled={connecting}
            className="px-4 py-4 rounded-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-medium text-sm transition-colors flex items-center justify-center"
          >
            {connecting ? (
              <PhoneCall size={20} className="text-white animate-pulse" />
            ) : (
              <Phone size={20} className="text-white" />
            )}
          </button>
        </div>
      )}
    </div>
  )
}
