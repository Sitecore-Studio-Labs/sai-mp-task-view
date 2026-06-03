"use client";

import { useMemo } from "react";

import { createBusinessEvents } from "../events/business";
import type { CapabilityFlags } from "../events/capability-filter";
import { createTechnicalEvents } from "../events/technical";

/**
 * Returns typed business + technical event trackers, pre-bound to the provided
 * platform capabilities so capability-gated events are dropped automatically.
 *
 * Prefer the `useTracking()` wrapper in @mp/ui which reads capabilities from context.
 */
export function useEventTracker(capabilities?: CapabilityFlags) {
  return useMemo(
    () => ({
      business: createBusinessEvents(capabilities),
      technical: createTechnicalEvents(),
    }),
    // capabilities is a stable object from PlatformCapabilitiesContext — safe to spread
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
}
