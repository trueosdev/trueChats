import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import MessageLoading from "./message-loading";
import { Button } from "@/components/ui/button";
// ChatBubble
const chatBubbleVariant = cva("flex gap-2 max-w-[60%] items-end relative group", {
    variants: {
        variant: {
            received: "self-start",
            sent: "self-end flex-row-reverse",
        },
        layout: {
            default: "",
            ai: "max-w-full w-full items-center",
        },
    },
    defaultVariants: {
        variant: "received",
        layout: "default",
    },
});
const ChatBubble = React.forwardRef(({ className, variant, layout, children, ...props }, ref) => (_jsx("div", { className: cn(chatBubbleVariant({ variant, layout, className }), "relative group"), ref: ref, ...props, children: React.Children.map(children, (child) => React.isValidElement(child) && typeof child.type !== "string"
        ? React.cloneElement(child, {
            variant,
            layout,
        })
        : child) })));
ChatBubble.displayName = "ChatBubble";
const ChatBubbleAvatar = ({ src, fallback, className, }) => (_jsxs(Avatar, { className: cn("h-9 w-9 shrink-0", className), children: [_jsx(AvatarImage, { src: src, alt: "Avatar" }), _jsx(AvatarFallback, { children: fallback })] }));
// ChatBubbleMessage
const chatBubbleMessageVariants = cva("p-4", {
    variants: {
        variant: {
            received: "bg-black/5 dark:bg-white/10 text-foreground rounded-r-lg rounded-tl-lg",
            sent: "bg-black/90 dark:bg-white/5 text-white dark:text-foreground rounded-l-lg rounded-tr-lg",
        },
        layout: {
            default: "",
            ai: "border-t border-black/10 dark:border-white/10 w-full rounded-none bg-transparent",
        },
    },
    defaultVariants: {
        variant: "received",
        layout: "default",
    },
});
const ChatBubbleMessage = React.forwardRef(({ className, variant, layout, isLoading = false, children, ...props }, ref) => (_jsx("div", { className: cn(chatBubbleMessageVariants({ variant, layout, className }), "break-words max-w-full whitespace-pre-wrap text-left"), ref: ref, ...props, children: isLoading ? (_jsx("div", { className: "flex items-center space-x-2", children: _jsx(MessageLoading, {}) })) : (children) })));
ChatBubbleMessage.displayName = "ChatBubbleMessage";
const ChatBubbleTimestamp = React.forwardRef(({ timestamp, createdAt, className, ...props }, ref) => {
    let formattedDate = null;
    if (createdAt) {
        try {
            const date = new Date(createdAt);
            if (!isNaN(date.getTime())) {
                formattedDate = date.toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                });
            }
        }
        catch (e) {
            // Invalid date, ignore
        }
    }
    return (_jsxs("div", { ref: ref, className: cn("text-xs mt-2 text-left flex flex-col", className), ...props, children: [formattedDate && (_jsx("div", { children: formattedDate })), _jsx("div", { children: timestamp })] }));
});
ChatBubbleTimestamp.displayName = "ChatBubbleTimestamp";
const ChatBubbleAction = ({ icon, onClick, className, variant = "ghost", size = "icon", ...props }) => (_jsx(Button, { variant: variant, size: size, className: className, onClick: onClick, ...props, children: icon }));
const ChatBubbleActionWrapper = React.forwardRef(({ variant, className, children, ...props }, ref) => (_jsx("div", { ref: ref, className: cn("absolute top-1/2 -translate-y-1/2 flex opacity-0 group-hover:opacity-100 transition-opacity duration-200", variant === "sent"
        ? "-left-1 -translate-x-full flex-row-reverse"
        : "-right-1 translate-x-full", className), ...props, children: children })));
ChatBubbleActionWrapper.displayName = "ChatBubbleActionWrapper";
export { ChatBubble, ChatBubbleAvatar, ChatBubbleMessage, ChatBubbleTimestamp, chatBubbleVariant, chatBubbleMessageVariants, ChatBubbleAction, ChatBubbleActionWrapper, };
