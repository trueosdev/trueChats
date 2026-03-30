"use client";

import { ChatLayout } from "@/components/chat/chat-layout";
import { Terminal } from "@/components/terminal/terminal";
import { useTerminal } from "@/hooks/useTerminal";
import { useEffect, useState } from "react";

export default function Home() {
  const { isTerminalMode } = useTerminal();
  const [defaultLayout, setDefaultLayout] = useState<number[] | undefined>(undefined);

  useEffect(() => {
    const layoutCookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith("react-resizable-panels:layout="));
    if (layoutCookie) {
      const layoutValue = layoutCookie.split("=")[1];
      try {
        setDefaultLayout(JSON.parse(decodeURIComponent(layoutValue)));
      } catch (e) {
        // Ignore parse errors
      }
    }
  }, []);

  if (isTerminalMode) {
    return <Terminal />;
  }

  return (
    <div
      className="z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden text-sm bg-background"
      style={{
        borderRadius: `calc(var(--frame-inset-pct) / 100 * var(--radius))`,
        borderWidth: `min(calc(var(--frame-inset-pct) * 0.1px), 1px)`,
        borderStyle: "solid",
        borderColor: `hsl(var(--border))`,
      }}
    >
      <ChatLayout defaultLayout={defaultLayout} navCollapsedSize={8} />
    </div>
  );
}