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
  const addMessage = useChatStore((state) => state.addMessage);
  const setLoading = useChatStore((state) => state.setLoading);
  const [typingUsers, setTypingUsers] = useState<TypingState[]>([]);
  const [typingChannel, setTypingChannel] = useState<RealtimeChannel | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  useEffect(() => {
    if (!conversation || !user) return;

    setLoading(true);
    getMessages(conversation.id).then((data) => {
      setMessages(data);
      setLoading(false);
      markMessagesAsRead(conversation.id, user.id).then(() => {
        useChatStore.getState().setUnreadCount(conversation.id, 0);
      });
    });

    const unsubscribe = subscribeToMessages(
      conversation.id,
      (message) => {
        addMessage(message);

        if (message.sender_id !== user.id) {
          markMessagesAsRead(conversation.id, user.id).then(() => {
            useChatStore.getState().setUnreadCount(conversation.id, 0);
          });
        }
      },
      { channelScope: "active-chat" },
    );

    const channel = subscribeToTypingIndicator(
      conversation.id,
      user.id,
      (typing) => {
        setTypingUsers(typing);
      }
    );
    setTypingChannel(channel);

    return () => {
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

      <ChatList
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
