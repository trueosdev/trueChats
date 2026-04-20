import * as React from "react";
import { cn } from "@/lib/utils";

interface UnreadBadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  /** Unread count. Values <= 0 render nothing. */
  count: number;
  /** Size preset. `sm` fits in tight sidebar corners, `md` is for larger rows. */
  size?: "sm" | "md";
  /** Number above which we display `99+` instead of the raw digits. */
  cap?: number;
}

/**
 * Small red "unread count" badge, modeled after iMessage / Slack app-icon dots.
 * Renders white text on a red fill with a background-colored hairline border
 * so it reads cleanly whether overlaid on an avatar, a loom icon, or a row.
 */
export function UnreadBadge({
  count,
  size = "sm",
  cap = 99,
  className,
  ...rest
}: UnreadBadgeProps) {
  if (count <= 0) return null;

  const label = count > cap ? `${cap}+` : String(count);
  const isCapped = count > cap;

  return (
    <span
      {...rest}
      className={cn(
        "inline-flex items-center justify-center rounded-full bg-red-500 text-white font-semibold leading-none tabular-nums ring-2 ring-background shadow-sm select-none pointer-events-none",
        size === "sm" &&
          (isCapped
            ? "h-4 min-w-[1.25rem] px-1 text-[9px]"
            : "h-4 min-w-[1rem] px-1 text-[10px]"),
        size === "md" &&
          (isCapped
            ? "h-5 min-w-[1.5rem] px-1.5 text-[10px]"
            : "h-5 min-w-[1.25rem] px-1.5 text-[11px]"),
        className,
      )}
      aria-label={`${count} unread`}
    >
      {label}
    </span>
  );
}
