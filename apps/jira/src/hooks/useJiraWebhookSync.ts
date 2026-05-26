"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

import { supabaseBrowserClient } from "@/lib/supabaseClient";

type JiraWebhookEventRow = {
  id: string;
  issue_key: string;
  project_key: string;
  event_type: string;
  occurred_at: string;
  created_at: string;
};

/**
 * Subscribes to Jira webhook events via Supabase Realtime and invalidates
 * TanStack Query so the Context Panel reflects external Jira updates (last-writer-wins).
 * Only active when enabled and projectKey is set (e.g. Jira connected and project selected).
 * @param onEvent - Optional callback when an event is applied for the current project.
 */
export function useJiraWebhookSync(
  projectKey: string | null,
  enabled: boolean,
  onEvent?: (issueKey: string) => void,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    const supabase = supabaseBrowserClient;
    if (!enabled || !projectKey) {
      console.log("[useJiraWebhookSync] Skipped: enabled=%s projectKey=%s", enabled, projectKey);
      return;
    }
    if (!supabase) {
      console.warn(
        "[useJiraWebhookSync] Supabase client is null. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }

    console.log("[useJiraWebhookSync] Subscribing for project %s", projectKey);

    // Use a unique channel name per project to avoid conflicts on remount
    const channelName = `jira_webhook_events:${projectKey}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "jira_webhook_events",
        },
        (payload) => {
          const row = payload.new as JiraWebhookEventRow;
          console.log("[useJiraWebhookSync] INSERT received:", row);
          if (row?.project_key !== projectKey) {
            console.log(
              "[useJiraWebhookSync] Skipping event for project %s (watching %s)",
              row?.project_key,
              projectKey,
            );
            return;
          }

          const issueKey = row.issue_key;
          console.log(
            "[useJiraWebhookSync] Invalidating queries for %s (%s)",
            issueKey,
            row.event_type,
          );
          onEvent?.(issueKey);
          queryClient.invalidateQueries({ queryKey: ["platform", "issues"] });
          queryClient.invalidateQueries({ queryKey: ["platform", "issue", issueKey] });
        },
      )
      .subscribe((status, err) => {
        if (err) {
          console.error("[useJiraWebhookSync] Subscription error:", err);
        } else {
          console.log("[useJiraWebhookSync] Channel %s status: %s", channelName, status);
        }
      });

    return () => {
      console.log("[useJiraWebhookSync] Removing channel %s", channelName);
      supabase.removeChannel(channel);
    };
  }, [enabled, projectKey, queryClient, onEvent]);
}
