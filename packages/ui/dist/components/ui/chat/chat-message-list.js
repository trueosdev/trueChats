import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { ArrowDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAutoScroll } from "./hooks/useAutoScroll";
const ChatMessageList = React.forwardRef(({ className, children, smooth = false, ...props }, _ref) => {
    const { scrollRef, isAtBottom, autoScrollEnabled, scrollToBottom, disableAutoScroll, } = useAutoScroll({
        smooth,
        content: children,
    });
    return (_jsxs("div", { className: "relative w-full h-full", children: [_jsx("div", { className: `flex flex-col w-full h-full p-4 overflow-y-auto ${className}`, ref: scrollRef, onWheel: disableAutoScroll, onTouchMove: disableAutoScroll, ...props, children: _jsx("div", { className: "flex flex-col gap-0", children: children }) }), !isAtBottom && (_jsx(Button, { onClick: () => {
                    scrollToBottom();
                }, size: "icon", variant: "outline", className: "absolute bottom-2 left-1/2 transform -translate-x-1/2 inline-flex rounded-full shadow-md", "aria-label": "Scroll to bottom", children: _jsx(ArrowDown, { className: "h-4 w-4" }) }))] }));
});
ChatMessageList.displayName = "ChatMessageList";
export { ChatMessageList };
