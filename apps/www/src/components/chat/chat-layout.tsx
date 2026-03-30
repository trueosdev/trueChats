"use client";

import React, { useEffect, useState, useRef } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";
import { cn, getAvatarUrl } from "@/lib/utils";
import { Sidebar } from "../sidebar";
import { Chat } from "./chat";
import { useAuth } from "@/hooks/useAuth";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { getConversations, subscribeToConversations } from "@/lib/services/conversations";
import useChatStore from "@/hooks/useChatStore";
import type { ConversationWithUser } from "@/app/data";
import { PendingChatsPage } from "../pending-chats-page";
import type { ImperativePanelHandle } from "react-resizable-panels";
import { getUnreadCounts, subscribeToMessages } from "@/lib/services/messages";
import { getPendingRequests, subscribeToChatRequests } from "@/lib/services/chat-requests";

interface ChatLayoutProps {
  defaultLayout: number[] | undefined;
  defaultCollapsed?: boolean;
  navCollapsedSize: number;
}

export function ChatLayout({
  defaultLayout = [320, 480],
  defaultCollapsed = false,
  navCollapsedSize,
}: ChatLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [isMobile, setIsMobile] = useState(false);
  const [showPendingChats, setShowPendingChats] = useState(false);
  const conversations = useChatStore((state) => state.conversations);
  const selectedConversationId = useChatStore((state) => state.selectedConversationId);
  const unreadCounts = useChatStore((state) => state.unreadCounts);
  const pendingRequestCount = useChatStore((state) => state.pendingRequestCount);
  const setConversations = useChatStore((state) => state.setConversations);
  const addConversation = useChatStore((state) => state.addConversation);
  const updateConversation = useChatStore((state) => state.updateConversation);
  const setSelectedConversationId = useChatStore((state) => state.setSelectedConversationId);
  const setLoading = useChatStore((state) => state.setLoading);
  const setUnreadCounts = useChatStore((state) => state.setUnreadCounts);
  const setUnreadCount = useChatStore((state) => state.setUnreadCount);
  const setPendingRequestCount = useChatStore((state) => state.setPendingRequestCount);
  const sidebarPanelRef = useRef<ImperativePanelHandle>(null);

  useEffect(() => {
    const checkScreenWidth = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkScreenWidth();
    window.addEventListener("resize", checkScreenWidth);

    return () => {
      window.removeEventListener("resize", checkScreenWidth);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    // Load conversations
    setLoading(true);
    getConversations(user.id).then(async (data) => {
      setConversations(data);
      setLoading(false);
      
      // Load unread counts for all conversations
      const conversationIds = data.map((c) => c.id);
      const counts = await getUnreadCounts(user.id, conversationIds);
      setUnreadCounts(counts);
    });

    // Load pending requests count
    getPendingRequests(user.id).then((requests) => {
      setPendingRequestCount(requests.length);
    });

    // Subscribe to real-time updates
    const unsubscribe = subscribeToConversations(user.id, (conversation) => {
      // Use the store's state directly instead of the stale closure
      const currentConversations = useChatStore.getState().conversations;
      const exists = currentConversations.find((c) => c.id === conversation.id);
      
      if (exists) {
        updateConversation(conversation.id, conversation);
      } else {
        addConversation(conversation);
      }
    });

    // Subscribe to chat requests
    const unsubscribeRequests = subscribeToChatRequests(user.id, (request) => {
      if (request.status === 'pending') {
        // Reload pending requests count
        getPendingRequests(user.id).then((requests) => {
          setPendingRequestCount(requests.length);
        });
      }
    });

    return () => {
      unsubscribe();
      unsubscribeRequests();
    };
  }, [user, setConversations, addConversation, updateConversation, setLoading, setUnreadCounts, setPendingRequestCount]);

  // Subscribe to all conversations' messages to update unread counts
  useEffect(() => {
    if (!user || conversations.length === 0) return;

    const unsubscribers = conversations.map((conv) => {
      return subscribeToMessages(conv.id, async (message) => {
        // If message is from another user and we're not viewing this conversation, increment unread
        if (message.sender_id !== user.id && selectedConversationId !== conv.id) {
          const counts = await getUnreadCounts(user.id, [conv.id]);
          setUnreadCount(conv.id, counts[conv.id] || 0);
        }
      });
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [user, conversations, selectedConversationId, setUnreadCount]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-center">
          <div className="loader mx-auto"></div>
        </div>
      </div>
    );
  }

  const selectedConversation = conversations.find(
    (c) => c.id === selectedConversationId
  );

  const handleConversationCreated = async (conversationId: string) => {
    // Reload conversations to get the new one with user details
    if (user) {
      const updatedConversations = await getConversations(user.id);
      setConversations(updatedConversations);
      setSelectedConversationId(conversationId);
      setShowPendingChats(false);
    }
  };

  const handlePendingChatsClick = () => {
    setShowPendingChats(true);
    setSelectedConversationId(null);
  };

  const handleRequestAccepted = (conversationId: string) => {
    setShowPendingChats(false);
    setSelectedConversationId(conversationId);
  };

  const handleDoubleClick = () => {
    const panel = sidebarPanelRef.current;
    if (!panel) return;

    if (isCollapsed) {
      panel.expand();
    } else {
      panel.collapse();
    }
  };

  return (
    <ProtectedRoute>
      <ResizablePanelGroup
        direction="horizontal"
        onLayout={(sizes: number[]) => {
          document.cookie = `react-resizable-panels:layout=${JSON.stringify(
            sizes,
          )}`;
        }}
        className="h-full items-stretch"
      >
        <ResizablePanel
          ref={sidebarPanelRef}
          defaultSize={defaultLayout[0]}
          collapsedSize={navCollapsedSize}
          collapsible={true}
          minSize={isMobile ? 0 : 24}
          maxSize={isMobile ? 8 : 30}
          onCollapse={() => {
            setIsCollapsed(true);
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(
              true,
            )}`;
          }}
          onExpand={() => {
            setIsCollapsed(false);
            document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(
              false,
            )}`;
          }}
          className={cn(
            isCollapsed &&
              "min-w-[50px] md:min-w-[70px] transition-all duration-300 ease-in-out",
          )}
        >
          <Sidebar
            isCollapsed={isCollapsed || isMobile}
            chats={conversations.map((conv) => {
              if (conv.is_group) {
                return {
                  id: conv.id,
                  name: conv.name || "Unnamed Group",
                  messages: conv.last_message ? [{
                    id: conv.last_message.id,
                    name: "Group",
                    message: conv.last_message.content,
                    timestamp: new Date(conv.last_message.created_at).toLocaleTimeString(),
                    avatar: getAvatarUrl(""),
                  }] : [],
                  avatar: getAvatarUrl(""),
                  variant: selectedConversationId === conv.id ? "secondary" : "ghost",
                  hasUnread: (unreadCounts[conv.id] || 0) > 0,
                  isGroup: true,
                  participantCount: conv.participant_count,
                  iconName: conv.icon_name || null,
                }
              } else {
                return {
                  id: conv.id,
                  name: conv.other_user?.fullname || conv.other_user?.username || conv.other_user?.email || "Unknown",
                  messages: conv.last_message ? [{
                    id: conv.last_message.id,
                    name: conv.other_user?.fullname || conv.other_user?.username || "Unknown",
                    message: conv.last_message.content,
                    timestamp: new Date(conv.last_message.created_at).toLocaleTimeString(),
                    avatar: getAvatarUrl(conv.other_user?.avatar_url),
                  }] : [],
                  avatar: getAvatarUrl(conv.other_user?.avatar_url),
                  variant: selectedConversationId === conv.id ? "secondary" : "ghost",
                  hasUnread: (unreadCounts[conv.id] || 0) > 0,
                  isGroup: false,
                }
              }
            })}
            isMobile={isMobile}
            loading={useChatStore.getState().loading}
            onChatSelect={(conversationId) => {
              setSelectedConversationId(conversationId);
              setShowPendingChats(false);
              // Clear unread count when selecting a conversation
              setUnreadCount(conversationId, 0);
            }}
            onNewChatCreated={handleConversationCreated}
            onGroupCreated={handleConversationCreated}
            onPendingChats={handlePendingChatsClick}
            pendingRequestCount={pendingRequestCount}
          />
        </ResizablePanel>
        <ResizableHandle withHandle onDoubleClick={handleDoubleClick} />
        <ResizablePanel defaultSize={defaultLayout[1]} minSize={30}>
          {showPendingChats ? (
            <PendingChatsPage onRequestAccepted={handleRequestAccepted} />
          ) : selectedConversation ? (
            <Chat
              conversation={selectedConversation}
              isMobile={isMobile}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-black dark:text-white">
              It&apos;s lonely in here...
            </div>
          )}
        </ResizablePanel>
      </ResizablePanelGroup>
    </ProtectedRoute>
  );
}
