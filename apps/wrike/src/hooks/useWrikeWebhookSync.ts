"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Invalidates TanStack Query when Wrike webhook events arrive.
 * Subscription (Azure / pub-sub) is not wired yet.
 *
 * Wrike webhook payloads contain only task IDs (no folder/project), so this hook
 * should invalidate the full issues list plus the specific task when any event arrives.
 * Only active when enabled (i.e. a Wrike account is connected).
 *
 * @param enabled  - Pass `connected` from useTaskManager.
 * @param onEvent  - Optional callback with the affected taskId.
 */
export function useWrikeWebhookSync(enabled: boolean, onEvent?: (taskId: string) => void) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    // TODO: subscribe to webhook events (Azure / pub-sub).
    // On INSERT:
    //   onEvent?.(taskId);
    //   queryClient.invalidateQueries({ queryKey: ["platform", "issues"] });
    //   queryClient.invalidateQueries({ queryKey: ["platform", "issue", taskId] });
  }, [enabled, queryClient, onEvent]);
}
