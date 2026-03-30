"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE_KEY = "trueChats:frame-border-slider";
const LEGACY_STORAGE_KEY = "trueChats:frame-inset-pct";
/** 0 = largest, no border (full bleed). 1–100 add outer padding; 100 = old default framed window. */
export const FRAME_INSET_DEFAULT_PCT = 100;
export const FRAME_INSET_MIN_PCT = 0;
export const FRAME_INSET_MAX_PCT = 100;

type FrameInsetContextValue = {
  insetPct: number;
  setInsetPct: (pct: number) => void;
  borderAdjustOpen: boolean;
  setBorderAdjustOpen: (open: boolean) => void;
  openBorderAdjust: () => void;
};

const FrameInsetContext = createContext<FrameInsetContextValue | null>(null);

function clampPct(value: number): number {
  return Math.min(
    FRAME_INSET_MAX_PCT,
    Math.max(FRAME_INSET_MIN_PCT, Math.round(value)),
  );
}

/** Legacy key stored 1–24 (vmin %). Map to new 0–100 slider; old max 24 → 100. */
function migrateLegacyInset(n: number): number {
  return clampPct(Math.round(((n - 1) / 23) * 100));
}

function readStoredPct(): number {
  if (typeof window === "undefined") return FRAME_INSET_DEFAULT_PCT;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored !== null) {
    const n = Number.parseInt(stored, 10);
    return Number.isNaN(n) ? FRAME_INSET_DEFAULT_PCT : clampPct(n);
  }
  const legacy = localStorage.getItem(LEGACY_STORAGE_KEY);
  if (legacy !== null) {
    const n = Number.parseInt(legacy, 10);
    if (!Number.isNaN(n) && n >= 1 && n <= 24) {
      const migrated = migrateLegacyInset(n);
      localStorage.setItem(STORAGE_KEY, String(migrated));
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      return migrated;
    }
    localStorage.removeItem(LEGACY_STORAGE_KEY);
  }
  return FRAME_INSET_DEFAULT_PCT;
}

export function FrameInsetProvider({ children }: { children: ReactNode }) {
  const [insetPctState, setInsetPctState] = useState(FRAME_INSET_DEFAULT_PCT);
  const [mounted, setMounted] = useState(false);
  const [borderAdjustOpen, setBorderAdjustOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
    setInsetPctState(readStoredPct());
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.style.setProperty(
      "--frame-inset-pct",
      String(insetPctState),
    );
    localStorage.setItem(STORAGE_KEY, String(insetPctState));
  }, [insetPctState, mounted]);

  const setInsetPct = useCallback((pct: number) => {
    setInsetPctState(clampPct(pct));
  }, []);

  const openBorderAdjust = useCallback(() => {
    setBorderAdjustOpen(true);
  }, []);

  /** Aligns with SSR / first client paint; then reflects localStorage after mount. */
  const insetPct = mounted ? insetPctState : FRAME_INSET_DEFAULT_PCT;

  const value = useMemo<FrameInsetContextValue>(
    () => ({
      insetPct,
      setInsetPct,
      borderAdjustOpen,
      setBorderAdjustOpen,
      openBorderAdjust,
    }),
    [insetPct, setInsetPct, borderAdjustOpen, openBorderAdjust],
  );

  return (
    <FrameInsetContext.Provider value={value}>
      {children}
    </FrameInsetContext.Provider>
  );
}

export function useFrameInset(): FrameInsetContextValue {
  const ctx = useContext(FrameInsetContext);
  if (!ctx) {
    throw new Error("useFrameInset must be used within FrameInsetProvider");
  }
  return ctx;
}
