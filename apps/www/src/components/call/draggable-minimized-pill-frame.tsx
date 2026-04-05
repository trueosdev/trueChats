"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

type Pos = { left: number; top: number };

/** Inset from the *visual* viewport so the pill never sits under scrollbars or past the window edge. */
const VIEWPORT_PAD_X = 16;
const VIEWPORT_PAD_TOP = 24;

function clampToViewport(left: number, top: number, width: number, height: number): Pos {
  const maxL = Math.max(
    VIEWPORT_PAD_X,
    window.innerWidth - width - VIEWPORT_PAD_X,
  );
  const maxT = Math.max(
    VIEWPORT_PAD_TOP,
    window.innerHeight - height - VIEWPORT_PAD_X,
  );
  return {
    left: Math.min(Math.max(VIEWPORT_PAD_X, left), maxL),
    top: Math.min(Math.max(VIEWPORT_PAD_TOP, top), maxT),
  };
}

/**
 * Fixed pill: portaled to `document.body` so `fixed` is always viewport-based (avoids clipped `right-*`
 * when an ancestor has a containing block). Initial spot is top-right with symmetric horizontal padding.
 */
export function DraggableMinimizedPillFrame({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<Pos | null>(null);
  const [mounted, setMounted] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originLeft: number;
    originTop: number;
  } | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const placeTopRight = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    if (w === 0 || h === 0) {
      requestAnimationFrame(placeTopRight);
      return;
    }
    setPos((prev) =>
      prev === null
        ? clampToViewport(
            window.innerWidth - w - VIEWPORT_PAD_X,
            VIEWPORT_PAD_TOP,
            w,
            h,
          )
        : clampToViewport(prev.left, prev.top, w, h),
    );
  }, []);

  useLayoutEffect(() => {
    if (!mounted) return;
    placeTopRight();
    const el = rootRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => placeTopRight());
    ro.observe(el);
    const onResize = () => placeTopRight();
    window.addEventListener("resize", onResize);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [mounted, placeTopRight]);

  const endDrag = useCallback((e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* already released */
    }
  }, []);

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || pos === null) return;
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest('[role="button"]') ||
      target.closest("a")
    ) {
      return;
    }
    dragRef.current = {
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      originLeft: pos.left,
      originTop: pos.top,
    };
    e.currentTarget.setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d || d.pointerId !== e.pointerId) return;
    const el = rootRef.current;
    const w = el?.offsetWidth ?? 280;
    const h = el?.offsetHeight ?? 48;
    const nextLeft = d.originLeft + (e.clientX - d.startX);
    const nextTop = d.originTop + (e.clientY - d.startY);
    setPos(clampToViewport(nextLeft, nextTop, w, h));
  };

  const shell = (
    <div
      ref={rootRef}
      className={cn(
        "fixed z-[201] touch-none select-none animate-in fade-in duration-300",
        pos === null && "left-0 top-0 w-max opacity-0 pointer-events-none",
        className,
      )}
      style={
        pos
          ? { left: pos.left, top: pos.top, opacity: 1 }
          : undefined
      }
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
    >
      <div className="cursor-grab rounded-full active:cursor-grabbing [&_button]:cursor-pointer">
        {children}
      </div>
    </div>
  );

  if (!mounted) {
    return shell;
  }

  return createPortal(shell, document.body);
}
