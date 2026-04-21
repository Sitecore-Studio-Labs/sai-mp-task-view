"use client";

import { useMemo } from "react";

import { resolveCapabilities } from "./capability-engine";

export function useCapability(platform: string) {
  return useMemo(() => {
    return resolveCapabilities(platform);
  }, [platform]);
}
