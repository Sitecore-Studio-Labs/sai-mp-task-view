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
    if (!enabled || !projectKey) return;
    if (!supabase) {
      console.warn(
        "[useJiraWebhookSync] Supabase client is null. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
      );
      return;
    }

    const channel = supabase
      .channel("jira_webhook_events")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "jira_webhook_events",
        },
        (payload) => {
          const row = payload.new as JiraWebhookEventRow;
          if (row?.project_key !== projectKey) return;

          const issueKey = row.issue_key;
          onEvent?.(issueKey);
          queryClient.invalidateQueries({ queryKey: ["jira", "issues", issueKey] });
          queryClient.invalidateQueries({
            predicate: (query) =>
              Array.isArray(query.queryKey) &&
              query.queryKey[0] === "jira" &&
              query.queryKey[1] === "boardIssues" &&
              query.queryKey[2] === projectKey,
          });
        },
      )
      .subscribe((_status, err) => {
        if (err) console.error("[useJiraWebhookSync] Subscription error:", err);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, projectKey, queryClient, onEvent]);
}
