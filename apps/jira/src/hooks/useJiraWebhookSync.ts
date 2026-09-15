"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Invalidates TanStack Query when Jira webhook events arrive.
 * Subscription (Azure / pub-sub) is not wired yet.
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
    if (!enabled || !projectKey) return;

    // TODO: subscribe to webhook events (Azure / pub-sub).
    // On INSERT for this projectKey:
    //   onEvent?.(issueKey);
    //   queryClient.invalidateQueries({ queryKey: ["platform", "issues"] });
    //   queryClient.invalidateQueries({ queryKey: ["platform", "issue", issueKey] });
  }, [enabled, projectKey, queryClient, onEvent]);
}
