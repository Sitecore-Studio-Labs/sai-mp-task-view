"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { apiClient } from "@/lib/axiosClient";
import { supabaseBrowserClient } from "@/lib/supabaseClient";

type WrikeWebhookEventRow = {
  id: string;
  issue_key: string;
  project_key: string;
  event_type: string;
  occurred_at: string;
  created_at: string;
};

/**
 * Subscribes to Wrike webhook events via Supabase Realtime and invalidates
 * TanStack Query so the Context Panel reflects external Wrike updates (last-writer-wins).
 * Also ensures a folder webhook is registered for the active project when connected.
 * Only active when enabled and projectKey is set (e.g. Wrike connected and folder selected).
 * @param onEvent - Optional callback when an event is applied for the current project.
 */
export function useWrikeWebhookSync(
  projectKey: string | null,
  enabled: boolean,
  onEvent?: (issueKey: string) => void,
) {
  const queryClient = useQueryClient();
  const registeredForRef = useRef<string | null>(null);

  // Ensure Wrike delivers events for this folder to our inbound webhook endpoint.
  useEffect(() => {
    if (!enabled || !projectKey) return;
    if (registeredForRef.current === projectKey) return;

    let cancelled = false;
    void (async () => {
      try {
        await apiClient.post("/wrike/webhooks", { folderId: projectKey });
        if (!cancelled) registeredForRef.current = projectKey;
      } catch (err) {
        // Localhost / unreachable hookUrl will fail — Realtime still works once events land.
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[useWrikeWebhookSync] Webhook registration failed (needs a public NEXT_PUBLIC_APP_URL):",
            err,
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [enabled, projectKey]);

  useEffect(() => {
    const supabase = supabaseBrowserClient;
    if (!enabled || !projectKey) return;
    if (!supabase) {
      console.warn(
        "[useWrikeWebhookSync] Supabase client is null. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }

    const channelName = `wrike_webhook_events:${projectKey}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "wrike_webhook_events",
        },
        (payload) => {
          const row = payload.new as WrikeWebhookEventRow;
          if (row?.project_key !== projectKey) return;

          const issueKey = row.issue_key;
          onEvent?.(issueKey);
          queryClient.invalidateQueries({ queryKey: ["platform", "issues"] });
          queryClient.invalidateQueries({ queryKey: ["platform", "issue", issueKey] });
          if (row.event_type?.startsWith("Comment")) {
            queryClient.invalidateQueries({ queryKey: ["platform", "comments", issueKey] });
          }
        },
      )
      .subscribe((_status, err) => {
        if (err) console.error("[useWrikeWebhookSync] Subscription error:", err);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, projectKey, queryClient, onEvent]);
}
