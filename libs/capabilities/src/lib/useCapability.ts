"use client";

import { useMemo } from "react";

import { CAPABILITY_REGISTRY } from "./capability-registry";

export function useCapability(platform: string) {
  return useMemo(() => {
    return CAPABILITY_REGISTRY[platform]?.capabilities ?? {};
  }, [platform]);
}
