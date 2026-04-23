import { ConversationWithUser } from "@/app/data";
import ChatTopbar from "./chat-topbar";
import { ChatList } from "./chat-list";
import React, { useEffect, useState } from "react";
import useChatStore from "@/hooks/useChatStore";
import ChatBottombar from "./chat-bottombar";
import { getMessages, subscribeToMessages, markMessagesAsRead } from "@/lib/services/messages";
import { useAuth } from "@/hooks/useAuth";
import { subscribeToTypingIndicator } from "@/lib/services/presence";
import type { TypingState } from "@/lib/services/presence";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { MessageSearchDialog } from "../message-search-dialog";

interface ChatProps {
  conversation: ConversationWithUser;
  isMobile: boolean;
}

export function Chat({ conversation, isMobile }: ChatProps) {
  const { user } = useAuth();
  const messages = useChatStore((state) => state.messages);
  const setMessages = useChatStore((state) => state.setMessages);
  const setConversationMessages = useChatStore(
    (state) => state.setConversationMessages,
  );
  const addMessage = useChatStore((state) => state.addMessage);
  const [typingUsers, setTypingUsers] = useState<TypingState[]>([]);
  const [typingChannel, setTypingChannel] = useState<RealtimeChannel | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (!conversation || !user) return;

    const convId = conversation.id;

    // Hydrate from cache for instant switch. If we've opened this chat
    // before, its messages show immediately (no skeleton, no "frozen"
    // stale-other-chat flash). Otherwise start empty and let the fetch
    // populate below. IMPORTANT: we do NOT toggle the global `loading`
    // here — that flag drives the sidebar skeleton and must only reflect
    // the initial conversations fetch.
    const cached = useChatStore.getState().messagesByConversation[convId];
    setMessages(cached ?? []);

    let cancelled = false;
    getMessages(convId).then((data) => {
      if (cancelled) return;
      // Writes cache and (if still the active chat) the live messages array.
      setConversationMessages(convId, data);
      markMessagesAsRead(convId, user.id).then(() => {
        useChatStore.getState().setUnreadCount(convId, 0);
      });
    });

    const unsubscribe = subscribeToMessages(
      convId,
      (message) => {
        addMessage(message);

        if (message.sender_id !== user.id) {
          markMessagesAsRead(convId, user.id).then(() => {
            useChatStore.getState().setUnreadCount(convId, 0);
          });
        }
      },
      { channelScope: "active-chat" },
    );

    const channel = subscribeToTypingIndicator(
      convId,
      user.id,
      (typing) => {
        setTypingUsers(typing);
      }
    );
    setTypingChannel(channel);

    return () => {
      cancelled = true;
      unsubscribe();
      if (channel) {
        channel.unsubscribe();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversation.id, user?.id]);

  return (
    <div className="flex flex-col justify-between w-full h-full">
      <ChatTopbar 
        conversation={conversation}
        onShowSearch={() => setShowSearch(true)}
      />

      {/* key on conversation.id forces a fresh mount per chat so the
          internal scroll state in useAutoScroll resets — opening a chat
          always lands at the bottom, even if the previous chat was
          scrolled up. */}
      <ChatList
        key={conversation.id}
        messages={messages}
        conversation={conversation}
        isMobile={isMobile}
        typingUsers={typingUsers}
      />

      <ChatBottombar 
        conversationId={conversation.id} 
        isMobile={isMobile}
        typingChannel={typingChannel}
      />

      <MessageSearchDialog
        open={showSearch}
        onOpenChange={setShowSearch}
        messages={messages}
        conversationName={
          conversation.other_user?.fullname || conversation.other_user?.username || conversation.other_user?.email || "Chat"
        }
      />
    </div>
  );
}
