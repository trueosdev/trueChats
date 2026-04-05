"use client";

import type { ReactNode } from "react";
import { LKFeatureContext } from "@livekit/components-react";
import { LIVEKIT_UI_FEATURE_FLAGS } from "@/components/call/livekit-room-media-defaults";

/** Overrides LiveKit feature flags without passing invalid props to the room root DOM node. */
export function LiveKitUiFeatureProvider({ children }: { children: ReactNode }) {
  return (
    <LKFeatureContext.Provider value={LIVEKIT_UI_FEATURE_FLAGS}>
      {children}
    </LKFeatureContext.Provider>
  );
}
