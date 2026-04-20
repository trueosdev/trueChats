"use client";

import React, { useEffect, useLayoutEffect, useState, useRef } from "react";
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
import type { ConversationWithUser, Thread } from "@/app/data";
import { PendingChatsPage } from "../pending-chats-page";
import type { PanelImperativeHandle } from "react-resizable-panels";
import { getUnreadCounts, subscribeToMessages } from "@/lib/services/messages";
import { getPendingRequests, subscribeToChatRequests } from "@/lib/services/chat-requests";
import { LoomSidebar } from "../loom/loom-sidebar";
import { RAIL_WIDTH } from "@/lib/layout-constants";
import { useCall } from "@/components/call/call-provider";
import { ThreadList } from "../loom/thread-list";
import { ThreadChat } from "../loom/thread-chat";
import { CreateLoomDialog } from "../loom/create-loom-dialog";
import { CreateThreadDialog } from "../loom/create-thread-dialog";
import { LoomMembersDialog } from "../loom/loom-members-dialog";
import { getLooms, subscribeToLooms } from "@/lib/services/looms";
import {
  getThreads,
  getThreadFolders,
  subscribeToThreads,
  subscribeToThreadFolders,
  getUnreadLoomCounts,
} from "@/lib/services/threads";
import { Snail } from "lucide-react";
import { supabase } from "@/lib/supabase/client";

/** `react-resizable-panels` v4 treats numeric sizes as px; persisted layout uses % (0–100). */
function panelDefaultSize(value: number): number | string {
  if (value >= 0 && value <= 100) return `${value}%`;
  return value;
}

interface ChatLayoutProps {
  defaultLayout: number[] | undefined;
  defaultCollapsed?: boolean;
}

export function ChatLayout({
  defaultLayout = [320, 480],
  defaultCollapsed = false,
}: ChatLayoutProps) {
  const { user, loading: authLoading } = useAuth();
  const [isCollapsed, setIsCollapsed] = React.useState(defaultCollapsed);
  const [isMobile, setIsMobile] = useState(false);
  const [showPendingChats, setShowPendingChats] = useState(false);
  const [showCreateLoom, setShowCreateLoom] = useState(false);
  const [showCreateThread, setShowCreateThread] = useState(false);
  const [createThreadDefaultFolderId, setCreateThreadDefaultFolderId] = useState<
    string | null
  >(null);
  const [showLoomMembers, setShowLoomMembers] = useState(false);
  const isSidebarCollapsed = isCollapsed || isMobile;

  const conversations = useChatStore((state) => state.conversations);
  const selectedConversationId = useChatStore((state) => state.selectedConversationId);
  const unreadCounts = useChatStore((state) => state.unreadCounts);
  const pendingRequestCount = useChatStore((state) => state.pendingRequestCount);
  const viewMode = useChatStore((state) => state.viewMode);
  const looms = useChatStore((state) => state.looms);
  const selectedLoomId = useChatStore((state) => state.selectedLoomId);
  const threads = useChatStore((state) => state.threads);
  const threadFolders = useChatStore((state) => state.threadFolders);
  const selectedThreadId = useChatStore((state) => state.selectedThreadId);
  const loomUnreadCounts = useChatStore((state) => state.loomUnreadCounts);
  const loomThreadsLoading = useChatStore((state) => state.loomLoading);

  const setConversations = useChatStore((state) => state.setConversations);
  const addConversation = useChatStore((state) => state.addConversation);
  const updateConversation = useChatStore((state) => state.updateConversation);
  const setSelectedConversationId = useChatStore((state) => state.setSelectedConversationId);
  const setLoading = useChatStore((state) => state.setLoading);
  const setUnreadCounts = useChatStore((state) => state.setUnreadCounts);
  const setUnreadCount = useChatStore((state) => state.setUnreadCount);
  const setPendingRequestCount = useChatStore((state) => state.setPendingRequestCount);
  const setViewMode = useChatStore((state) => state.setViewMode);
  const setLooms = useChatStore((state) => state.setLooms);
  const setSelectedLoomId = useChatStore((state) => state.setSelectedLoomId);
  const setThreads = useChatStore((state) => state.setThreads);
  const setThreadFolders = useChatStore((state) => state.setThreadFolders);
  const setSelectedThreadId = useChatStore((state) => state.setSelectedThreadId);
  const setLoomLoading = useChatStore((state) => state.setLoomLoading);
  const addThread = useChatStore((state) => state.addThread);
  const setLoomUnreadCounts = useChatStore((state) => state.setLoomUnreadCounts);

  const sidebarPanelRef = useRef<PanelImperativeHandle | null>(null);
  const loomRailMeasureRef = useRef<HTMLDivElement | null>(null);
  const sidebarMeasureRef = useRef<HTMLDivElement | null>(null);
  const { callState, isMinimized, conversationId: dmCallConversationId } =
    useCall();
  const dmCallFullscreenOverlay =
    callState === "connected" && !isMinimized;

  useLayoutEffect(() => {
    if (!dmCallFullscreenOverlay) {
      document.documentElement.style.removeProperty("--dm-call-inset-left");
      return;
    }

    const root = document.documentElement;
    const measure = () => {
      const loom = loomRailMeasureRef.current?.offsetWidth ?? 0;
      const sidebar = sidebarMeasureRef.current?.offsetWidth ?? 0;
      root.style.setProperty("--dm-call-inset-left", `${loom + sidebar}px`);
    };

    measure();
    const ro = new ResizeObserver(measure);
    if (loomRailMeasureRef.current) ro.observe(loomRailMeasureRef.current);
    if (sidebarMeasureRef.current) ro.observe(sidebarMeasureRef.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
      root.style.removeProperty("--dm-call-inset-left");
    };
  }, [dmCallFullscreenOverlay]);

  useEffect(() => {
    const checkScreenWidth = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    checkScreenWidth();
    window.addEventListener("resize", checkScreenWidth);
    return () => window.removeEventListener("resize", checkScreenWidth);
  }, []);

  // Load conversations and subscribe to DM changes
  useEffect(() => {
    if (!user) return;

    setLoading(true);
    getConversations(user.id).then(async (data) => {
      setConversations(data);
      setLoading(false);
      const conversationIds = data.map((c) => c.id);
      const counts = await getUnreadCounts(user.id, conversationIds);
      setUnreadCounts(counts);
    });

    getPendingRequests(user.id).then((requests) => {
      setPendingRequestCount(requests.length);
    });

    const unsubscribe = subscribeToConversations(user.id, (conversation) => {
      const currentConversations = useChatStore.getState().conversations;
      const exists = currentConversations.find((c) => c.id === conversation.id);
      if (exists) {
        updateConversation(conversation.id, conversation);
      } else {
        addConversation(conversation);
      }
    });

    const unsubscribeRequests = subscribeToChatRequests(user.id, (request) => {
      if (request.status === 'pending') {
        getPendingRequests(user.id).then((requests) => {
          setPendingRequestCount(requests.length);
        });
      }
    });

    return () => {
      unsubscribe();
      unsubscribeRequests();
    };
  }, [user]);

  // Load looms
  useEffect(() => {
    if (!user) return;

    getLooms(user.id).then(setLooms);

    const unsubscribe = subscribeToLooms(user.id, (loom) => {
      const currentLooms = useChatStore.getState().looms;
      const exists = currentLooms.find(l => l.id === loom.id);
      if (exists) {
        useChatStore.getState().updateLoom(loom.id, loom);
      } else {
        useChatStore.getState().addLoom(loom);
      }
    });

    return () => unsubscribe();
  }, [user]);

  // Load threads when a loom is selected (loomLoading = thread list only, not thread messages)
  useEffect(() => {
    if (!selectedLoomId) {
      setThreads([]);
      setLoomLoading(false);
      return;
    }

    const loomId = selectedLoomId;
    setThreads([]);
    setThreadFolders([]);
    setLoomLoading(true);

    let cancelled = false;
    Promise.all([getThreads(loomId), getThreadFolders(loomId)]).then(
      ([threadData, folderData]) => {
        if (cancelled) return;
        setThreads(threadData);
        setThreadFolders(folderData);
        setLoomLoading(false);
      },
    );

    const unsubscribeThreads = subscribeToThreads(loomId, {
      onUpsert: (thread) => {
        const currentThreads = useChatStore.getState().threads;
        const exists = currentThreads.find((t) => t.id === thread.id);
        if (exists) {
          useChatStore.getState().updateThread(thread.id, thread);
        } else {
          useChatStore.getState().addThread(thread);
        }
      },
      onDelete: (threadId) => {
        useChatStore.getState().removeThread(threadId);
      },
    });

    const unsubscribeFolders = subscribeToThreadFolders(loomId, {
      onUpsert: (folder) => {
        const current = useChatStore.getState().threadFolders;
        const exists = current.some((f) => f.id === folder.id);
        if (exists) {
          useChatStore.getState().updateThreadFolder(folder.id, folder);
        } else {
          useChatStore.getState().addThreadFolder(folder);
        }
      },
      onDelete: (folderId) => {
        useChatStore.getState().removeThreadFolder(folderId);
      },
    });

    return () => {
      cancelled = true;
      unsubscribeThreads();
      unsubscribeFolders();
    };
  }, [
    selectedLoomId,
    setThreads,
    setThreadFolders,
    setLoomLoading,
  ]);

  // Subscribe to messages for unread count updates
  useEffect(() => {
    if (!user || conversations.length === 0) return;

    const unsubscribers = conversations.map((conv) => {
      return subscribeToMessages(
        conv.id,
        async (message) => {
          if (message.sender_id !== user.id && selectedConversationId !== conv.id) {
            const counts = await getUnreadCounts(user.id, [conv.id]);
            setUnreadCount(conv.id, counts[conv.id] || 0);
          }
        },
        { channelScope: "layout-unread" },
      );
    });

    return () => {
      unsubscribers.forEach((unsub) => unsub());
    };
  }, [user, conversations, selectedConversationId, setUnreadCount]);

  // Keep Loom unread counts in sync for rail dots
  useEffect(() => {
    if (!user || looms.length === 0) {
      setLoomUnreadCounts({});
      return;
    }

    let cancelled = false;
    const loomIds = looms.map((l) => l.id);

    const refreshLoomUnread = async () => {
      const counts = await getUnreadLoomCounts(user.id, loomIds);
      if (!cancelled) setLoomUnreadCounts(counts);
    };

    refreshLoomUnread();
    const interval = window.setInterval(refreshLoomUnread, 10000);
    const channel = supabase
      .channel(`loom-unread-dot:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "thread_messages",
        },
        () => {
          void refreshLoomUnread();
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      window.clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [user, looms, selectedThreadId, setLoomUnreadCounts]);

  if (authLoading) {
    return (
      <div className="flex items-center justify-center h-full w-full">
        <div className="text-center">
          <div className="loader mx-auto"></div>
        </div>
      </div>
    );
  }

  const selectedConversation = conversations.find((c) => c.id === selectedConversationId);
  const selectedLoom = looms.find(l => l.id === selectedLoomId);
  const selectedThread = threads.find(t => t.id === selectedThreadId);

  const handleConversationCreated = async (conversationId: string) => {
    if (user) {
      const updatedConversations = await getConversations(user.id);
      setConversations(updatedConversations);
      setSelectedConversationId(conversationId);
      setShowPendingChats(false);
    }
  };

  const handleLoomCreated = async (loomId: string) => {
    if (user) {
      const updatedLooms = await getLooms(user.id);
      setLooms(updatedLooms);
      setViewMode('looms');
      setSelectedLoomId(loomId);
    }
  };

  const handleThreadCreated = (thread: Thread) => {
    addThread(thread);
    setSelectedThreadId(thread.id);
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
    if (isCollapsed) panel.expand();
    else panel.collapse();
  };

  const handleDmsSelect = () => {
    setViewMode('dms');
    setSelectedLoomId(null);
    setSelectedThreadId(null);
  };

  const handleLoomSelect = (loomId: string) => {
    setViewMode('looms');
    setSelectedLoomId(loomId);
    setSelectedConversationId(null);
    setShowPendingChats(false);
  };

  const renderSidebarContent = () => {
    const collapsed = isSidebarCollapsed;
    const loomNav = viewMode === 'looms' && selectedLoom ? (
      <ThreadList
        loom={selectedLoom}
        threads={threads}
        threadFolders={threadFolders}
        selectedThreadId={selectedThreadId}
        onThreadSelect={(threadId) => setSelectedThreadId(threadId)}
        onCreateThread={(folderId) => {
          setCreateThreadDefaultFolderId(folderId ?? null);
          setShowCreateThread(true);
        }}
        onShowMembers={() => setShowLoomMembers(true)}
        loading={loomThreadsLoading}
        isCollapsed={collapsed}
      />
    ) : undefined;

    return (
      <Sidebar
        isCollapsed={isSidebarCollapsed}
        chats={conversations.filter(conv => !conv.is_group).map((conv) => ({
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
        }))}
        isMobile={isMobile}
        loading={useChatStore.getState().loading}
        onChatSelect={(conversationId) => {
          setSelectedConversationId(conversationId);
          setShowPendingChats(false);
          setUnreadCount(conversationId, 0);
        }}
        onNewChatCreated={handleConversationCreated}
        onPendingChats={handlePendingChatsClick}
        pendingRequestCount={pendingRequestCount}
        customNav={loomNav}
      />
    );
  };

  // Render the main content area
  const renderMainContent = () => {
    if (viewMode === 'looms' && selectedLoom && selectedThread) {
      return (
        <ThreadChat
          thread={selectedThread}
          loom={selectedLoom}
          isMobile={isMobile}
        />
      );
    }

    if (viewMode === 'looms' && selectedLoom && !selectedThread) {
      return (
        <div className="flex items-center justify-center h-full">
          <div className="text-center space-y-2">
            <p className="text-black/40 dark:text-white/40">Select a thread to start chatting</p>
            <button
              onClick={() => setShowCreateThread(true)}
              className="text-sm text-black/60 dark:text-white/60 hover:text-black dark:hover:text-white underline underline-offset-2"
            >
              or create a new one
            </button>
          </div>
        </div>
      );
    }

    if (showPendingChats) {
      return <PendingChatsPage onRequestAccepted={handleRequestAccepted} />;
    }

    if (selectedConversation) {
      if (
        dmCallFullscreenOverlay &&
        dmCallConversationId === selectedConversation.id
      ) {
        return (
          <div
            className="h-full min-h-0 w-full bg-background"
            aria-hidden
          />
        );
      }
      return (
        <Chat
          conversation={selectedConversation}
          isMobile={isMobile}
        />
      );
    }

    return (
      <div className="flex items-center justify-center h-full text-black dark:text-white gap-2">
        <Snail strokeWidth={1.5} size={22} />
        It&apos;s lonely in here...
      </div>
    );
  };

  return (
    <ProtectedRoute>
      <div className="flex h-full">
        {/* Loom rail — width is summed into --dm-call-inset-left so DM call overlay leaves rail + thread list visible */}
        <div ref={loomRailMeasureRef} className="h-full shrink-0">
          <LoomSidebar
            looms={looms}
            loomUnreadCounts={loomUnreadCounts}
            selectedLoomId={selectedLoomId}
            viewMode={viewMode}
            onLoomSelect={handleLoomSelect}
            onDmsSelect={handleDmsSelect}
            onCreateLoom={() => setShowCreateLoom(true)}
            loading={authLoading}
          />
        </div>

        {/* Main content area */}
        <ResizablePanelGroup
          orientation="horizontal"
          onLayoutChanged={(layout) => {
            const sizes = [layout.sidebar ?? 0, layout.main ?? 0];
            document.cookie = `react-resizable-panels:layout=${JSON.stringify(sizes)}`;
          }}
          className="h-full items-stretch flex-1"
        >
          <ResizablePanel
            id="sidebar"
            ref={sidebarPanelRef}
            defaultSize={panelDefaultSize(defaultLayout[0])}
            collapsedSize={RAIL_WIDTH}
            collapsible={true}
            minSize={isMobile ? "0%" : "24%"}
            maxSize={isMobile ? "8%" : "30%"}
            onResize={() => {
              const collapsed = sidebarPanelRef.current?.isCollapsed() ?? false;
              setIsCollapsed(collapsed);
              document.cookie = `react-resizable-panels:collapsed=${JSON.stringify(collapsed)}`;
            }}
            className={cn(
              "transition-all duration-300 ease-in-out",
              isSidebarCollapsed && "collapsed-rail",
            )}
            style={{ minWidth: RAIL_WIDTH, ...(isSidebarCollapsed ? { width: RAIL_WIDTH } : {}) }}
          >
            <div
              ref={sidebarMeasureRef}
              className="flex h-full min-h-0 min-w-0 flex-col"
            >
              {renderSidebarContent()}
            </div>
          </ResizablePanel>
          <ResizableHandle withHandle onDoubleClick={handleDoubleClick} />
          <ResizablePanel
            id="main"
            defaultSize={panelDefaultSize(defaultLayout[1])}
            minSize="30%"
            className="min-h-0"
          >
            {renderMainContent()}
          </ResizablePanel>
        </ResizablePanelGroup>

        {/* Dialogs */}
        <CreateLoomDialog
          open={showCreateLoom}
          onOpenChange={setShowCreateLoom}
          onLoomCreated={handleLoomCreated}
        />

        {selectedLoomId && (
          <CreateThreadDialog
            open={showCreateThread}
            onOpenChange={(open) => {
              setShowCreateThread(open);
              if (!open) setCreateThreadDefaultFolderId(null);
            }}
            loomId={selectedLoomId}
            threadFolders={threadFolders}
            defaultFolderId={createThreadDefaultFolderId}
            onThreadCreated={handleThreadCreated}
          />
        )}

        {selectedLoom && (
          <LoomMembersDialog
            open={showLoomMembers}
            onOpenChange={setShowLoomMembers}
            loomId={selectedLoom.id}
            loomName={selectedLoom.name}
          />
        )}
      </div>
    </ProtectedRoute>
  );
}
