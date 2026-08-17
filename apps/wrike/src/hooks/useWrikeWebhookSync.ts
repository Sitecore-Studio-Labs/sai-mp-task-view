"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabaseBrowserClient } from "@/lib/supabaseClient";

type WrikeWebhookEventRow = {
  id: string;
  task_id: string;
  event_type: string;
  occurred_at: string;
  created_at: string;
};

/**
 * Subscribes to Wrike webhook events via Supabase Realtime and invalidates
 * TanStack Query so the Context Panel reflects external Wrike updates (last-writer-wins).
 *
 * Wrike webhook payloads contain only task IDs (no folder/project), so this hook
 * invalidates the full issues list plus the specific task when any event arrives.
 * Only active when enabled (i.e. a Wrike account is connected).
 *
 * @param enabled  - Pass `connected` from useTaskManager.
 * @param onEvent  - Optional callback with the affected taskId.
 */
export function useWrikeWebhookSync(
  enabled: boolean,
  onEvent?: (taskId: string) => void,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = supabaseBrowserClient;
    if (!enabled) return;
    if (!supabase) {
      console.warn(
        "[useWrikeWebhookSync] Supabase client is null. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }

    const channel = supabase
      .channel("wrike_webhook_events")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "wrike_webhook_events",
        },
        (payload) => {
          const row = payload.new as WrikeWebhookEventRow;
          const taskId = row?.task_id;
          if (!taskId) return;

          onEvent?.(taskId);
          queryClient.invalidateQueries({ queryKey: ["platform", "issues"] });
          queryClient.invalidateQueries({ queryKey: ["platform", "issue", taskId] });
        },
      )
      .subscribe((_status, err) => {
        if (err) console.error("[useWrikeWebhookSync] Subscription error:", err);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient, onEvent]);
}
