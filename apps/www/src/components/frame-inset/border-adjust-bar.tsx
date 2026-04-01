"use client";

import { useEffect } from "react";
import { X } from "lucide-react";
import {
  FRAME_INSET_MAX_PCT,
  FRAME_INSET_MIN_PCT,
  useFrameInset,
} from "@/components/frame-inset/frame-inset-provider";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BorderAdjustBar() {
  const {
    insetPct,
    setInsetPct,
    borderAdjustOpen,
    setBorderAdjustOpen,
  } = useFrameInset();

  useEffect(() => {
    if (!borderAdjustOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBorderAdjustOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [borderAdjustOpen, setBorderAdjustOpen]);

  if (!borderAdjustOpen) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[99]"
        aria-hidden
        onClick={() => setBorderAdjustOpen(false)}
      />
      <div
        className={cn(
          "fixed inset-x-0 top-0 z-[100] flex items-center justify-center gap-4 px-4 py-2.5",
          "border-b border-black/10 dark:border-white/10 bg-background/85 backdrop-blur-md",
        )}
        role="region"
        aria-label="Adjust outer frame: 0 full window, 100 default framed look"
      >
        <span className="text-xs text-muted-foreground tabular-nums min-w-[2.25rem] text-right shrink-0">
          {insetPct}%
        </span>
        <input
          type="range"
          min={FRAME_INSET_MIN_PCT}
          max={FRAME_INSET_MAX_PCT}
          step={1}
          value={insetPct}
          onChange={(e) => setInsetPct(Number(e.target.value))}
          className={cn(
            "h-px w-[min(18rem,50vw)] max-w-full cursor-pointer appearance-none bg-transparent",
            "[&::-webkit-slider-runnable-track]:h-px [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-border",
            "[&::-webkit-slider-thumb]:-mt-1.5 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-black/20 dark:[&::-webkit-slider-thumb]:border-white/20 [&::-webkit-slider-thumb]:bg-background",
            "[&::-moz-range-track]:h-px [&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-border",
            "[&::-moz-range-thumb]:h-3 [&::-moz-range-thumb]:w-3 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-black/20 dark:[&::-moz-range-thumb]:border-white/20 [&::-moz-range-thumb]:bg-background",
          )}
          aria-valuemin={FRAME_INSET_MIN_PCT}
          aria-valuemax={FRAME_INSET_MAX_PCT}
          aria-valuenow={insetPct}
          aria-valuetext={
            insetPct === 0
              ? "Full window, no frame"
              : insetPct === 100
                ? "Default framed window"
                : `${insetPct}% toward default frame`
          }
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0 rounded-full"
          onClick={() => setBorderAdjustOpen(false)}
          aria-label="Close"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </>
  );
}
