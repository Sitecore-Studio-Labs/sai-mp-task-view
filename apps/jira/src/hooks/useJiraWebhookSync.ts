"use client";

import { WebPubSubClient } from "@azure/web-pubsub-client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

/**
 * Subscribes to Jira webhook events via Azure Web PubSub and invalidates
 * TanStack Query so the Context Panel reflects external Jira updates.
 *
 * On mount it fetches a short-lived client access URL from /api/jira/negotiate,
 * opens a WebSocket connection to the "jira" hub, then joins the group named
 * after the active projectKey.  Only messages for that project trigger query
 * invalidation, so switching projects re-runs the effect and joins the new group.
 *
 * When /api/jira/negotiate returns 503 (connection string not configured) the
 * hook exits silently — the UI can fall back to polling /api/jira/sync-signal.
 *
 * @param projectKey - The active Jira project key (e.g. "MP"). Pass null to disable.
 * @param enabled    - Pass `connected` from useTaskManager.
 * @param onEvent    - Optional callback with the affected issueKey.
 */
export function useJiraWebhookSync(
  projectKey: string | null,
  enabled: boolean,
  onEvent?: (issueKey: string) => void,
) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled || !projectKey) return;

    let wpsClient: WebPubSubClient | null = null;
    let cancelled = false;

    async function start() {
      try {
        const res = await fetch("/api/jira/negotiate");
        if (!res.ok) {
          if (res.status !== 503) {
            console.warn("[useJiraWebhookSync] Negotiate failed:", res.status);
          }
          return;
        }

        const body = (await res.json()) as { url?: string };
        if (!body.url || cancelled) return;

        const client = new WebPubSubClient(body.url);
        wpsClient = client;

        client.on("group-message", (e) => {
          if (e.message.group !== projectKey) return;
          const data = e.message.data as { issueKey?: string };
          const issueKey = data?.issueKey;
          if (!issueKey) return;

          onEvent?.(issueKey);
          queryClient.invalidateQueries({ queryKey: ["platform", "issues"] });
          queryClient.invalidateQueries({ queryKey: ["platform", "issue", issueKey] });
        });

        await client.start();

        if (!cancelled) {
          await client.joinGroup(projectKey!);
        }
      } catch (err) {
        if (!cancelled) {
          console.error("[useJiraWebhookSync] Failed to start Web PubSub client:", err);
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      wpsClient?.stop();
    };
  }, [enabled, projectKey, queryClient, onEvent]);
}
