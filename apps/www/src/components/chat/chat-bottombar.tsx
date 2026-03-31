import {
  FileImage,
  Paperclip,
  SendHorizontal,
  ThumbsUp,
  X,
  Loader2,
} from "lucide-react";
import React, { useRef, useState } from "react";
import { Button, buttonVariants } from "../ui/button";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { EmojiPicker } from "../emoji-picker";
import { ChatInput } from "@shadcn-chat/ui";
import { sendMessage } from "@/lib/services/messages";
import { useAuth } from "@/hooks/useAuth";
import useChatStore from "@/hooks/useChatStore";
import { uploadAttachment, type AttachmentData, formatFileSize } from "@/lib/services/attachments";
import { broadcastTyping } from "@/lib/services/presence";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { FilePreview } from "./file-preview";

interface ChatBottombarProps {
  conversationId: string;
  isMobile: boolean;
  typingChannel: RealtimeChannel | null;
  customSendMessage?: (conversationId: string, content: string, senderId: string, attachment?: AttachmentData, replyToId?: string) => Promise<any>;
}

export const BottombarIcons = [{ icon: FileImage }, { icon: Paperclip }];

export default function ChatBottombar({ conversationId, isMobile, typingChannel, customSendMessage }: ChatBottombarProps) {
  const { user } = useAuth();
  const [message, setMessage] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const addMessage = useChatStore((state) => state.addMessage);
  const replyingTo = useChatStore((state) => state.replyingTo);
  const setReplyingTo = useChatStore((state) => state.setReplyingTo);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewUrl, setFilePreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout | undefined>(undefined);

  const handleInputChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(event.target.value);
    
    // Broadcast typing indicator
    if (user && typingChannel) {
      broadcastTyping(
        typingChannel, 
        user.id, 
        conversationId, 
        true, 
        user.user_metadata?.username || user.user_metadata?.fullname
      );
      
      // Clear typing after 3 seconds of no typing
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        if (typingChannel) {
          broadcastTyping(
            typingChannel, 
            user.id, 
            conversationId, 
            false, 
            user.user_metadata?.username || user.user_metadata?.fullname
          );
        }
      }, 3000);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    processFile(file);
  };

  const processFile = (file: File) => {
    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB');
      return;
    }
    
    setSelectedFile(file);
    
    // Create preview URL for images
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    } else {
      setFilePreviewUrl(null);
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Check if clipboard contains image data
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      
      // Check if the item is an image
      if (item.type.indexOf('image') !== -1) {
        e.preventDefault(); // Prevent pasting image data as text
        
        const blob = item.getAsFile();
        if (!blob) return;

        // Determine file extension based on MIME type
        let extension = 'png';
        if (item.type === 'image/heic' || item.type === 'image/heif') {
          extension = 'heic';
        } else if (item.type === 'image/jpeg' || item.type === 'image/jpg') {
          extension = 'jpg';
        } else if (item.type === 'image/gif') {
          extension = 'gif';
        } else if (item.type === 'image/webp') {
          extension = 'webp';
        } else if (item.type === 'image/png') {
          extension = 'png';
        }

        // Convert blob to File with a proper name
        const file = new File([blob], `pasted-image-${Date.now()}.${extension}`, {
          type: blob.type || 'image/png',
        });

        processFile(file);
        return;
      }
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFilePreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleThumbsUp = async () => {
    if (!user || !conversationId) return;
    
    setSelectedLoading(true);
    const send = customSendMessage || sendMessage;
    const sentMessage = await send(conversationId, "👍", user.id);
    if (sentMessage) {
      addMessage(sentMessage);
    }
    setSelectedLoading(false);
  };

  const handleSend = async () => {
    if ((!message.trim() && !selectedFile) || !user || !conversationId) return;
    
    setSelectedLoading(true);
    
    try {
      let attachment: AttachmentData | undefined = undefined;
      
      // Upload file if selected
      if (selectedFile) {
        setUploading(true);
        const uploadResult = await uploadAttachment(user.id, selectedFile);
        setUploading(false);
        
        if (!uploadResult) {
          alert('Failed to upload file');
          setSelectedLoading(false);
          return;
        }
        attachment = uploadResult;
      }
      
      const send = customSendMessage || sendMessage;
      const sentMessage = await send(
        conversationId, 
        message.trim() || ' ',  // Space if only attachment
        user.id,
        attachment,
        replyingTo?.id as string | undefined
      );
      
      if (sentMessage) {
        addMessage(sentMessage);
        setMessage("");
        setReplyingTo(null);
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Stop typing indicator
        if (typingChannel) {
          broadcastTyping(
            typingChannel, 
            user.id, 
            conversationId, 
            false, 
            user.user_metadata?.username || user.user_metadata?.fullname
          );
        }
        
        // Clear timeout
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSelectedLoading(false);
      setUploading(false);
    }

    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSend();
    }

    if (event.key === "Enter" && event.shiftKey) {
      event.preventDefault();
      setMessage((prev) => prev + "\n");
    }
  };

  return (
    <div className="relative w-full">
      {/* Reply preview */}
      {replyingTo && (
        <div className="absolute bottom-full left-0 right-0 mb-2 px-4 py-2 bg-muted/50 border border-border rounded-lg flex items-center justify-between gap-2 z-10">
          <div className="flex-1 min-w-0">
            <div className="text-xs text-muted-foreground mb-1">Replying to {replyingTo.name}</div>
            <div className="text-sm truncate">{replyingTo.message || '(attachment)'}</div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 shrink-0"
            onClick={() => setReplyingTo(null)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      
      <div className="px-2 py-4 flex justify-between w-full items-center gap-2">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,image/heic,image/heif,.heic,.heif,.pdf,.doc,.docx,.xls,.xlsx,.txt"
          onChange={handleFileSelect}
          className="hidden"
          disabled={selectedLoading || uploading}
        />

      {/* File preview */}
      {selectedFile && (
        <FilePreview
          file={selectedFile}
          previewUrl={filePreviewUrl}
          onRemove={handleRemoveFile}
          disabled={selectedLoading || uploading}
        />
      )}
      
      <div className="flex">
        {BottombarIcons.map((icon, index) => (
          <button
            key={index}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              buttonVariants({ variant: "ghost", size: "icon" }),
              "h-9 w-9",
              "shrink-0",
            )}
            disabled={selectedLoading || uploading}
          >
            <icon.icon size={22} className="text-muted-foreground" />
          </button>
        ))}
      </div>

      <AnimatePresence initial={false}>
        <motion.div
          key="input"
          className="w-full relative"
          layout
          initial={{ opacity: 0, scale: 1 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 1 }}
          transition={{
            opacity: { duration: 0.05 },
            layout: {
              type: "spring",
              bounce: 0.15,
            },
          }}
        >
          <ChatInput
            value={message}
            ref={inputRef}
            onKeyDown={handleKeyPress}
            onChange={handleInputChange}
            onPaste={handlePaste}
            placeholder="Type a message..."
            className="rounded-full"
          />
          <div className="absolute right-4 bottom-2  ">
            <EmojiPicker
              onChange={(value) => {
                setMessage(message + value);
                if (inputRef.current) {
                  inputRef.current.focus();
                }
              }}
            />
          </div>
        </motion.div>

        {message.trim() || selectedFile ? (
          <Button
            className="h-9 w-9 shrink-0"
            onClick={handleSend}
            disabled={selectedLoading || uploading}
            variant="ghost"
            size="icon"
          >
            {uploading ? (
              <Loader2 size={22} className="text-muted-foreground animate-spin" />
            ) : (
              <SendHorizontal size={22} className="text-muted-foreground" />
            )}
          </Button>
        ) : (
          <Button
            className="h-9 w-9 shrink-0"
            onClick={handleThumbsUp}
            disabled={selectedLoading}
            variant="ghost"
            size="icon"
          >
            <ThumbsUp size={22} className="text-muted-foreground" />
          </Button>
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
