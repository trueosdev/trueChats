interface UseAutoScrollOptions {
    offset?: number;
    smooth?: boolean;
    content?: React.ReactNode;
}
export declare function useAutoScroll(options?: UseAutoScrollOptions): {
    scrollRef: import("react").RefObject<HTMLDivElement | null>;
    isAtBottom: boolean;
    autoScrollEnabled: boolean;
    scrollToBottom: () => void;
    disableAutoScroll: () => void;
};
export {};
//# sourceMappingURL=useAutoScroll.d.ts.map