"use client";

import { Message, ConversationWithUser } from "@/app/data";
import { useAvatarUrl } from "@/hooks/useAvatarUrl";
import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChatMessageList } from "@shadcn-chat/ui";
import { Forward, Download, Pencil, Copy } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import type { TypingState } from "@/lib/services/presence";
import { isImageFile, formatFileSize } from "@/lib/services/attachments";
import { editMessage } from "@/lib/services/messages";
import useChatStore from "@/hooks/useChatStore";
import { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { ThemeAvatarImage } from "@/components/ui/theme-avatar";
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
} from "@/components/ui/context-menu";

interface ChatListProps {
  messages: Message[];
  conversation: ConversationWithUser;
  isMobile: boolean;
  typingUsers?: TypingState[];
}

function MessageAvatar({ avatarUrl }: { avatarUrl?: string | null }) {
  const themeAwareUrl = useAvatarUrl(avatarUrl);
  return (
    <Avatar className="h-10 w-10 shrink-0">
      <ThemeAvatarImage avatarUrl={themeAwareUrl} alt="" />
    </Avatar>
  );
}

function formatMessageTime(createdAt?: string, timestamp?: string): string {
  if (createdAt) {
    try {
      const date = new Date(createdAt);
      if (!isNaN(date.getTime())) {
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        const yesterday = new Date(now);
        yesterday.setDate(yesterday.getDate() - 1);
        const isYesterday = date.toDateString() === yesterday.toDateString();

        const time = date.toLocaleTimeString([], {
          hour: "numeric",
          minute: "2-digit",
        });

        if (isToday) return `Today, ${time}`;
        if (isYesterday) return `Yesterday, ${time}`;

        return `${date.toLocaleDateString([], {
          month: "numeric",
          day: "numeric",
          year: "2-digit",
        })}, ${time}`;
      }
    } catch {
      // fall through
    }
  }
  return timestamp || "";
}

function shouldShowHeader(
  messages: Message[],
  index: number,
): boolean {
  if (index === 0) return true;
  const current = messages[index];
  const previous = messages[index - 1];
  if (current.sender_id !== previous.sender_id) return true;
  if (current.created_at && previous.created_at) {
    const gap =
      new Date(current.created_at).getTime() -
      new Date(previous.created_at).getTime();
    if (gap > 5 * 60 * 1000) return true;
  }
  return false;
}

function shouldShowDateSeparator(
  messages: Message[],
  index: number,
): string | null {
  if (index === 0 && messages[0]?.created_at) {
    return new Date(messages[0].created_at).toLocaleDateString([], {
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }
  if (index > 0) {
    const current = messages[index];
    const previous = messages[index - 1];
    if (current.created_at && previous.created_at) {
      const curDate = new Date(current.created_at).toDateString();
      const prevDate = new Date(previous.created_at).toDateString();
      if (curDate !== prevDate) {
        return new Date(current.created_at).toLocaleDateString([], {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
      }
    }
  }
  return null;
}

export function ChatList({
  messages,
  conversation,
  isMobile,
  typingUsers = [],
}: ChatListProps) {
  const { user } = useAuth();
  const setReplyingTo = useChatStore((state) => state.setReplyingTo);
  const updateMessage = useChatStore((state) => state.updateMessage);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState("");

  const findRepliedMessage = (
    replyToId: string | null | undefined,
  ): Message | null => {
    if (!replyToId) return null;
    return messages.find((m) => m.id === replyToId) || null;
  };

  const renderReadReceipt = (message: Message) => {
    if (message.sender_id !== user?.id) return null;
    if (message.read_at) {
      return (
        <img
          src="/read.svg"
          alt="Read"
          className="inline-block h-3 w-3 align-baseline opacity-30"
        />
      );
    }
    return (
      <img
        src="/delivered.svg"
        alt="Delivered"
          className="inline-block h-3 w-3 align-baseline opacity-20"
      />
    );
  };

  const handleReply = (message: Message) => {
    setReplyingTo(message);
  };

  const handleEdit = (message: Message) => {
    if (message.sender_id !== user?.id) return;
    setEditingMessageId(message.id as string);
    setEditContent(message.message || "");
  };

  const handleSaveEdit = async (messageId: string) => {
    if (!user) return;
    const success = await editMessage(messageId, editContent, user.id);
    if (success) {
      updateMessage(messageId, { message: editContent });
      setEditingMessageId(null);
      setEditContent("");
    }
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditContent("");
  };

  const handleCopy = async (message: Message) => {
    const textToCopy = message.message || "";
    try {
      await navigator.clipboard.writeText(textToCopy);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = textToCopy;
      textArea.style.position = "fixed";
      textArea.style.opacity = "0";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
      } catch {
        // ignore
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div className="w-full overflow-y-hidden h-full flex flex-col">
      <ChatMessageList>
        <AnimatePresence>
          {messages.map((message, index) => {
            const showHeader = shouldShowHeader(messages, index);
            const dateSep = shouldShowDateSeparator(messages, index);
            const isSelf = message.sender_id === user?.id;

            return (
              <React.Fragment key={message.id}>
                {dateSep && (
                  <div className="flex items-center gap-4 py-2">
                    <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
                    <span className="text-xs text-muted-foreground font-medium">
                      {dateSep}
                    </span>
                    <div className="flex-1 h-px bg-black/10 dark:bg-white/10" />
                  </div>
                )}
                <motion.div
                  data-message-id={message.id}
                  layout
                  initial={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                  animate={{ opacity: 1, scale: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, scale: 1, y: 1, x: 0 }}
                  transition={{
                    opacity: { duration: 0 },
                    layout: { type: "spring", bounce: 0.3, duration: 0 },
                  }}
                  className={`group flex gap-3 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] px-1 rounded-md -mx-1 ${
                    showHeader
                      ? "mt-4 py-0.5 first:mt-0"
                      : "mt-0.5 py-0 first:mt-0"
                  }`}
                >
                  {/* Avatar column */}
                  <div className="w-10 shrink-0 pt-0.5">
                    {showHeader && <MessageAvatar avatarUrl={message.avatar} />}
                  </div>

                  {/* Content column */}
                  <div className="flex-1 min-w-0">
                    <ContextMenu>
                      <ContextMenuTrigger asChild>
                        <div>
                          {/* Header: name + time + read receipt */}
                          {showHeader && (
                            <div className="flex items-baseline gap-2 mb-0.5">
                              <span className="text-sm font-semibold">
                                {message.name}
                              </span>
                              <span className="text-xs text-muted-foreground/50">
                                {formatMessageTime(
                                  message.created_at,
                                  message.timestamp,
                                )}
                              </span>
                              {isSelf && (
                                <span className="translate-y-[1px] opacity-0 transition-opacity group-hover:opacity-100">
                                  {renderReadReceipt(message)}
                                </span>
                              )}
                            </div>
                          )}

                          {/* Reply context */}
                          {message.reply_to &&
                            (() => {
                              const repliedMessage = findRepliedMessage(
                                message.reply_to,
                              );
                              if (repliedMessage) {
                                return (
                                  <div className="mb-1 p-2 border-l border-black/10 dark:border-white/10 bg-muted/30 rounded text-sm">
                                    <div className="text-xs text-muted-foreground mb-0.5">
                                      {repliedMessage.name}
                                    </div>
                                    <div className="truncate">
                                      {repliedMessage.message || "(attachment)"}
                                    </div>
                                  </div>
                                );
                              }
                              return null;
                            })()}

                          {/* Attachment */}
                          {message.attachment_url && (
                            <div className="mb-1 not-prose">
                              {isImageFile(message.attachment_type || "") ? (
                                <a
                                  href={message.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block group/img relative overflow-hidden rounded-md max-w-sm"
                                >
                                  <div className="relative bg-gradient-to-br from-black/3 to-black/5 dark:from-white/5 dark:to-white/10 p-1">
                                    <img
                                      src={message.attachment_url}
                                      alt={
                                        message.attachment_name ||
                                        "Image attachment"
                                      }
                                      className="rounded-md w-full h-auto object-contain shadow-sm group-hover/img:scale-[1.01] transition-transform duration-100 ease-out"
                                      style={{ maxHeight: "400px" }}
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover/img:bg-black/5 transition-colors rounded-lg pointer-events-none" />
                                  </div>
                                </a>
                              ) : (
                                <a
                                  href={message.attachment_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-3 p-4 bg-gradient-to-r from-black/80 to-black/90 dark:from-white/5 dark:to-white/10 border border-black/10 dark:border-white/10 rounded-xl hover:shadow-md transition-all duration-200 group/file max-w-sm"
                                >
                                  <div className="flex items-center justify-center w-10 h-10 bg-black/70 dark:bg-white/10 rounded-lg shadow-sm group-hover/file:scale-110 transition-transform">
                                    <Download className="h-5 w-5 text-white/90 dark:text-white/70" />
                                  </div>
                                  <div className="flex flex-col flex-1 min-w-0">
                                    <span className="text-sm font-medium text-white truncate">
                                      {message.attachment_name}
                                    </span>
                                    <span className="text-xs text-white/70">
                                      {formatFileSize(
                                        message.attachment_size || 0,
                                      )}
                                    </span>
                                  </div>
                                  <div className="text-white/50 group-hover/file:text-white/70 transition-colors">
                                    <svg
                                      className="w-4 h-4"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 5l7 7-7 7"
                                      />
                                    </svg>
                                  </div>
                                </a>
                              )}
                            </div>
                          )}

                          {/* Message body */}
                          {editingMessageId === message.id ? (
                            <div className="flex flex-col gap-2">
                              <textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSaveEdit(message.id as string);
                                  } else if (e.key === "Escape") {
                                    handleCancelEdit();
                                  }
                                }}
                                className="w-full p-2 border border-black/10 dark:border-white/10 rounded bg-background text-foreground resize-none"
                                autoFocus
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={handleCancelEdit}
                                  className="text-xs text-muted-foreground hover:text-foreground"
                                >
                                  Cancel
                                </button>
                                <button
                                  onClick={() =>
                                    handleSaveEdit(message.id as string)
                                  }
                                  className="text-xs text-primary hover:underline"
                                >
                                  Save
                                </button>
                              </div>
                            </div>
                          ) : message.isLoading ? (
                            <div className="flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap break-words leading-snug">
                              {message.message}
                              {message.edited_at && (
                                <span className="text-xs text-muted-foreground italic">
                                  {" "}
                                  (edited)
                                </span>
                              )}
                            </p>
                          )}

                          {/* Read receipt inline for grouped (no-header) messages */}
                          {isSelf && !showHeader && (
                            <span className="ml-1 inline-block translate-y-[1px] opacity-0 transition-opacity group-hover:opacity-100">
                              {renderReadReceipt(message)}
                            </span>
                          )}
                        </div>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        {isSelf ? (
                          <>
                            <ContextMenuItem
                              onClick={() => handleEdit(message)}
                              className="cursor-pointer"
                            >
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </ContextMenuItem>
                            <ContextMenuItem
                              onClick={() => handleReply(message)}
                              className="cursor-pointer"
                            >
                              <Forward className="mr-2 h-4 w-4" />
                              <span>Reply</span>
                            </ContextMenuItem>
                            <ContextMenuItem
                              onClick={() => handleCopy(message)}
                              className="cursor-pointer"
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              <span>Copy</span>
                            </ContextMenuItem>
                          </>
                        ) : (
                          <>
                            <ContextMenuItem
                              onClick={() => handleReply(message)}
                              className="cursor-pointer"
                            >
                              <Forward className="mr-2 h-4 w-4" />
                              <span>Reply</span>
                            </ContextMenuItem>
                            <ContextMenuItem
                              onClick={() => handleCopy(message)}
                              className="cursor-pointer"
                            >
                              <Copy className="mr-2 h-4 w-4" />
                              <span>Copy</span>
                            </ContextMenuItem>
                          </>
                        )}
                      </ContextMenuContent>
                    </ContextMenu>
                  </div>
                </motion.div>
              </React.Fragment>
            );
          })}

          {/* Typing Indicators */}
          {typingUsers.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="mt-2 flex gap-3 px-1 py-0.5"
            >
              <div className="w-10 shrink-0" />
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:0ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:150ms]" />
                <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40 animate-bounce [animation-delay:300ms]" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </ChatMessageList>
    </div>
  );
}
