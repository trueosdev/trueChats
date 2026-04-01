import * as React from "react";
import { type VariantProps } from "class-variance-authority";
import { ButtonProps } from "@/components/ui/button";
declare const chatBubbleVariant: (props?: ({
    variant?: "received" | "sent" | null | undefined;
    layout?: "default" | "ai" | null | undefined;
} & import("class-variance-authority/dist/types").ClassProp) | undefined) => string;
interface ChatBubbleProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof chatBubbleVariant> {
}
declare const ChatBubble: React.ForwardRefExoticComponent<ChatBubbleProps & React.RefAttributes<HTMLDivElement>>;
interface ChatBubbleAvatarProps {
    src?: string;
    fallback?: string;
    className?: string;
}
declare const ChatBubbleAvatar: React.FC<ChatBubbleAvatarProps>;
declare const chatBubbleMessageVariants: (props?: ({
    variant?: "received" | "sent" | null | undefined;
    layout?: "default" | "ai" | null | undefined;
} & import("class-variance-authority/dist/types").ClassProp) | undefined) => string;
interface ChatBubbleMessageProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof chatBubbleMessageVariants> {
    isLoading?: boolean;
}
declare const ChatBubbleMessage: React.ForwardRefExoticComponent<ChatBubbleMessageProps & React.RefAttributes<HTMLDivElement>>;
interface ChatBubbleTimestampProps extends React.HTMLAttributes<HTMLDivElement> {
    timestamp: string;
    createdAt?: string;
}
declare const ChatBubbleTimestamp: React.ForwardRefExoticComponent<ChatBubbleTimestampProps & React.RefAttributes<HTMLDivElement>>;
type ChatBubbleActionProps = ButtonProps & {
    icon: React.ReactNode;
};
declare const ChatBubbleAction: React.FC<ChatBubbleActionProps>;
interface ChatBubbleActionWrapperProps extends React.HTMLAttributes<HTMLDivElement> {
    variant?: "sent" | "received";
    className?: string;
}
declare const ChatBubbleActionWrapper: React.ForwardRefExoticComponent<ChatBubbleActionWrapperProps & React.RefAttributes<HTMLDivElement>>;
export { ChatBubble, ChatBubbleAvatar, ChatBubbleMessage, ChatBubbleTimestamp, chatBubbleVariant, chatBubbleMessageVariants, ChatBubbleAction, ChatBubbleActionWrapper, };
//# sourceMappingURL=chat-bubble.d.ts.map