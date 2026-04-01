"use client";

import React, { useEffect, useState } from "react";
import { Check, X, Mailbox, Ghost } from "lucide-react";
import { Avatar } from "./ui/avatar";
import { ThemeAvatarImage } from "./ui/theme-avatar";
import { Button } from "./ui/button";
import { getPendingRequests, getOutgoingRequests, acceptChatRequest, denyChatRequest, getCooldownRemaining, type ChatRequest } from "@/lib/services/chat-requests";
import { useAuth } from "@/hooks/useAuth";
import { ExpandableChatHeader } from "@shadcn-chat/ui";
import useChatStore from "@/hooks/useChatStore";
import { getConversations, createConversation } from "@/lib/services/conversations";
import { supabase } from "@/lib/supabase/client";
import { useColorTheme } from "@/hooks/useColorTheme";

interface PendingChatsPageProps {
  onRequestAccepted?: (conversationId: string) => void;
}

type ViewType = 'incoming' | 'outgoing';

export function PendingChatsPage({ onRequestAccepted }: PendingChatsPageProps) {
  const { user } = useAuth();
  const { colorTheme } = useColorTheme();
  const isBlackWhite = colorTheme.name === "Black & White";
  const [incomingRequests, setIncomingRequests] = useState<ChatRequest[]>([]);
  const [outgoingRequests, setOutgoingRequests] = useState<ChatRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [cooldowns, setCooldowns] = useState<Record<string, number | null>>({});
  const [activeView, setActiveView] = useState<ViewType>('incoming');
  const setConversations = useChatStore((state) => state.setConversations);
  const setSelectedConversationId = useChatStore((state) => state.setSelectedConversationId);
  const setPendingRequestCount = useChatStore((state) => state.setPendingRequestCount);

  useEffect(() => {
    if (!user) return;

    loadRequests();

    // Update cooldowns every minute
    const cooldownInterval = setInterval(() => {
      updateCooldowns();
    }, 60000);

    return () => {
      clearInterval(cooldownInterval);
    };
  }, [user]);

  const loadRequests = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const [incoming, outgoing] = await Promise.all([
        getPendingRequests(user.id),
        getOutgoingRequests(user.id),
      ]);
      setIncomingRequests(incoming);
      setOutgoingRequests(outgoing);
      setPendingRequestCount(incoming.length);
      
      // Update cooldowns for denied requests
      updateCooldowns();
    } catch (error) {
      console.error('Error loading requests:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCooldowns = async () => {
    if (!user) return;

    const cooldownMap: Record<string, number | null> = {};
    for (const request of outgoingRequests) {
      if (request.status === 'denied') {
        const remaining = await getCooldownRemaining(request.requester_id, request.recipient_id);
        cooldownMap[request.id] = remaining;
      }
    }
    setCooldowns(cooldownMap);
  };

  const handleAccept = async (requestId: string) => {
    if (!user || processing) return;

    setProcessing(requestId);
    try {
      const result = await acceptChatRequest(requestId, user.id);
      if (result.success) {
        // Reload requests
        await loadRequests();
        
        // Reload conversations to include the new one
        if (user) {
          const updatedConversations = await getConversations(user.id);
          setConversations(updatedConversations);
          
          // Select the new conversation
          if (result.conversationId) {
            setSelectedConversationId(result.conversationId);
            if (onRequestAccepted) {
              onRequestAccepted(result.conversationId);
            }
          }
        }
      }
    } catch (error) {
      console.error('Error accepting request:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleDeny = async (requestId: string) => {
    if (!user || processing) return;

    setProcessing(requestId);
    try {
      const success = await denyChatRequest(requestId, user.id);
      if (success) {
        await loadRequests();
      }
    } catch (error) {
      console.error('Error denying request:', error);
    } finally {
      setProcessing(null);
    }
  };

  const formatCooldown = (hours: number | null): string => {
    if (hours === null) return '';
    if (hours <= 0) return 'Available now';
    if (hours < 1) return `${Math.ceil(hours * 60)} minutes`;
    if (hours === 1) return '1 hour';
    return `${Math.ceil(hours)} hours`;
  };

  const outgoingAccepted = outgoingRequests.filter((r) => r.status === "accepted");
  const outgoingPendingOrDenied = outgoingRequests.filter((r) => r.status !== "accepted");

  const renderOutgoingRow = (request: ChatRequest) => {
    const displayName =
      request.recipient?.fullname ||
      request.recipient?.username ||
      request.recipient?.email ||
      "Unknown";
    const cooldown = cooldowns[request.id];
    const showCooldown =
      request.status === "denied" && cooldown !== null && cooldown > 0;

    return (
      <div
        key={request.id}
        className={`flex items-center gap-3 p-3 rounded-lg border border-black/10 dark:border-white/10 hover:bg-black/15 dark:hover:bg-white/5 ${
          request.status === "accepted" ? "cursor-pointer" : ""
        }`}
        onClick={() => {
          if (request.status === "accepted") {
            handleAcceptedRequestClick(request);
          }
        }}
      >
        <Avatar className="h-10 w-10">
          <ThemeAvatarImage
            avatarUrl={request.recipient?.avatar_url}
            alt={displayName}
          />
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-black dark:text-white truncate">
            {displayName}
          </p>
          {request.recipient?.username && (
            <p className="text-xs text-muted-foreground">
              @{request.recipient.username}
            </p>
          )}
          {showCooldown && (
            <p
              className={`text-xs mt-1 ${isBlackWhite ? "text-foreground" : "text-orange-600 dark:text-orange-400"}`}
            >
              Cooldown: {formatCooldown(cooldown)}
            </p>
          )}
        </div>
        <div className="flex items-center">
          {request.status === "accepted" ? (
            <span
              className={`text-xs px-2 py-1 rounded ${isBlackWhite ? "bg-foreground text-background" : "bg-green-100 text-[#181818]"}`}
            >
              Click to open chat
            </span>
          ) : (
            <span
              className={`text-xs px-2 py-1 rounded ${
                isBlackWhite
                  ? "bg-foreground text-background"
                  : request.status === "pending"
                    ? "bg-yellow-100 text-[#181818]"
                    : "bg-red-100 text-[#181818]"
              }`}
            >
              {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
            </span>
          )}
        </div>
      </div>
    );
  };

  const handleAcceptedRequestClick = async (request: ChatRequest) => {
    if (!user || request.status !== 'accepted') return;

    try {
      // First, reload conversations to ensure we have the latest data
      const updatedConversations = await getConversations(user.id);
      setConversations(updatedConversations);
      
      // Find the conversation between the two users from the loaded conversations
      let conversation = updatedConversations.find((conv) => {
        if (conv.is_group) return false;
        return (
          (conv.user1_id === request.requester_id && conv.user2_id === request.recipient_id) ||
          (conv.user1_id === request.recipient_id && conv.user2_id === request.requester_id)
        );
      });

      // If not found in loaded conversations, query the database directly
      if (!conversation) {
        const { data: convData, error: convError } = await supabase
          .from('conversations')
          .select('id')
          .eq('is_group', false)
          .or(`and(user1_id.eq.${request.requester_id},user2_id.eq.${request.recipient_id}),and(user1_id.eq.${request.recipient_id},user2_id.eq.${request.requester_id})`)
          .maybeSingle();

        // If conversation doesn't exist but request is accepted, create it
        if ((convError || !convData) && request.status === 'accepted') {
          console.log('Conversation not found, creating it for accepted request');
          const newConversation = await createConversation(request.requester_id, request.recipient_id);
          
          if (!newConversation) {
            console.error('Failed to create conversation for accepted request');
            return;
          }

          // Reload conversations to include the newly created conversation
          const refreshedConversations = await getConversations(user.id);
          setConversations(refreshedConversations);
          
          // Find the conversation from the refreshed list
          conversation = refreshedConversations.find((conv) => {
            if (conv.is_group) return false;
            return conv.id === newConversation.id;
          });

          if (!conversation) {
            console.error('Conversation still not found after creation');
            return;
          }
        } else if (convError || !convData) {
          console.error('Conversation not found between users:', convError);
          return;
        } else {
          // Conversation found in database, reload and find it
          const refreshedConversations = await getConversations(user.id);
          setConversations(refreshedConversations);
          
          // Find the conversation from the refreshed list
          conversation = refreshedConversations.find((conv) => {
            if (conv.is_group) return false;
            return (
              (conv.user1_id === request.requester_id && conv.user2_id === request.recipient_id) ||
              (conv.user1_id === request.recipient_id && conv.user2_id === request.requester_id)
            );
          });

          if (!conversation) {
            console.error('Conversation still not found after refresh');
            return;
          }
        }
      }
      
      // Select the conversation
      setSelectedConversationId(conversation.id);
      if (onRequestAccepted) {
        onRequestAccepted(conversation.id);
      }
    } catch (error) {
      console.error('Error opening accepted chat:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="loader mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-full">

      {/* View Toggle */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex gap-2">
          <Button
            variant={activeView === 'incoming' ? 'secondary' : 'ghost'}
            size="lg"
            onClick={() => setActiveView('incoming')}
            className="flex-1"
          >
            Incoming ({incomingRequests.length})
          </Button>
          <Button
            variant={activeView === 'outgoing' ? 'secondary' : 'ghost'}
            size="lg"
            onClick={() => setActiveView('outgoing')}
            className="flex-1"
          >
            Outgoing ({outgoingRequests.length})
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {activeView === 'incoming' ? (
          /* Incoming Requests */
          <div>
            {incomingRequests.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[400px] text-center text-muted-foreground">
                <div>
                  <Ghost size={48} className="mx-auto mb-2" />
                  <p>No pending requests. Zilch.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {incomingRequests.map((request) => {
                  const displayName = request.requester?.fullname || request.requester?.username || request.requester?.email || "Unknown";
                  return (
                    <div
                      key={request.id}
                      className="flex items-center gap-3 p-3 rounded-lg border border-black/10 dark:border-white/10"
                    >
                      <Avatar className="h-10 w-10">
                        <ThemeAvatarImage
                          avatarUrl={request.requester?.avatar_url}
                          alt={displayName}
                        />
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-black dark:text-white truncate">
                          {displayName}
                        </p>
                        {request.requester?.username && (
                          <p className="text-xs text-muted-foreground">
                            @{request.requester.username}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleAccept(request.id)}
                          disabled={processing === request.id}
                          className={isBlackWhite 
                            ? "h-8 w-8 text-foreground hover:text-foreground hover:bg-accent" 
                            : "h-8 w-8 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"}
                          title="Accept"
                        >
                          <Check size={18} />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeny(request.id)}
                          disabled={processing === request.id}
                          className={isBlackWhite 
                            ? "h-8 w-8 text-foreground hover:text-foreground hover:bg-accent" 
                            : "h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950"}
                          title="Deny"
                        >
                          <X size={18} />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          /* Outgoing Requests */
          <div>
            {outgoingRequests.length === 0 ? (
              <div className="flex items-center justify-center h-full min-h-[400px] text-center text-muted-foreground">
                <div>
                  <Mailbox size={48} className="mx-auto mb-2 opacity-50" />
                  <p>No outgoing requests. Zilch.</p>
                </div>
              </div>
            ) : (
              <div className="space-y-8">
                {outgoingAccepted.length > 0 && (
                  <section aria-labelledby="outgoing-accepted-heading">
                    <h2
                      id="outgoing-accepted-heading"
                      className="text-sm font-semibold text-black dark:text-white mb-3"
                    >
                      Accepted ({outgoingAccepted.length})
                    </h2>
                    <div className="space-y-2">
                      {outgoingAccepted.map((request) => renderOutgoingRow(request))}
                    </div>
                  </section>
                )}
                {outgoingPendingOrDenied.length > 0 && (
                  <section aria-labelledby="outgoing-pending-denied-heading">
                    <h2
                      id="outgoing-pending-denied-heading"
                      className="text-sm font-semibold text-black dark:text-white mb-3"
                    >
                      Pending &amp; denied ({outgoingPendingOrDenied.length})
                    </h2>
                    <div className="space-y-2">
                      {outgoingPendingOrDenied.map((request) =>
                        renderOutgoingRow(request),
                      )}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

