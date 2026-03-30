import type { Metadata } from "next";
import { Questrial } from "next/font/google";
import "./globals.css";
import "./terminal.css";
import "@shadcn-chat/ui/styles.css";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { GitHubLogoIcon } from "@radix-ui/react-icons";
import { ThemeProvider } from "@/components/theme-provider";
import { ModeToggle } from "@/components/mode-toggle";
import { AuthProvider } from "@/components/auth/auth-provider";
import { TerminalModeProvider } from "@/components/terminal/terminal-mode-provider";
import { FrameInsetProvider } from "@/components/frame-inset/frame-inset-provider";
import { BorderAdjustBar } from "@/components/frame-inset/border-adjust-bar";
import { CallProvider } from "@/components/call/call-provider";
import { IncomingCallOverlay } from "@/components/call/incoming-call-overlay";
import { ActiveCallView } from "@/components/call/active-call-view";

const questrial = Questrial({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "trueChats",
  description: "Always true.",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={questrial.className}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <AuthProvider>
            <CallProvider>
              <FrameInsetProvider>
                <TerminalModeProvider>
                  <main className="flex h-[calc(100dvh)] min-h-0 flex-col items-stretch p-[var(--frame-inset)] transition-[padding] duration-200 ease-out">
                    {children}
                  </main>
                </TerminalModeProvider>
                <BorderAdjustBar />
              </FrameInsetProvider>
              <IncomingCallOverlay />
              <ActiveCallView />
            </CallProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
