import { jsx as _jsx } from "react/jsx-runtime";
import * as React from "react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
const ChatInput = React.forwardRef(({ className, ...props }, ref) => (_jsx(Textarea, { autoComplete: "off", ref: ref, name: "message", className: cn("max-h-12 px-4 py-3.5 bg-background text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring border border-black/10 dark:border-white/10 disabled:cursor-not-allowed disabled:opacity-50 w-full rounded-md h-12 resize-none", className), ...props })));
ChatInput.displayName = "ChatInput";
export { ChatInput };
