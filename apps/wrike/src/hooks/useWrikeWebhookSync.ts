"use client";

import { WebPubSubClient } from "@azure/web-pubsub-client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";

const WPS_GROUP = "wrike_events";

/**
 * Subscribes to Wrike webhook events via Azure Web PubSub and invalidates
 * TanStack Query so the Context Panel reflects external Wrike updates.
 *
 * On mount it fetches a short-lived client access URL from /api/wrike/negotiate.
 * The negotiate token pre-joins the client to the "wrike_events" group so no
 * explicit joinGroup call is needed.  Any message in that group triggers a full
 * issues + specific-task invalidation (Wrike payloads carry only task IDs, not
 * a project key, so all issues are invalidated on every event).
 *
 * When /api/wrike/negotiate returns 503 (connection string not configured) the
 * hook exits silently — the UI can fall back to polling /api/wrike/sync-signal.
 *
 * @param enabled  - Pass `connected` from useTaskManager.
 * @param onEvent  - Optional callback with the affected taskId.
 */
export function useWrikeWebhookSync(enabled: boolean, onEvent?: (taskId: string) => void) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    let wpsClient: WebPubSubClient | null = null;
    let cancelled = false;

    async function start() {
      try {
        const res = await fetch("/api/wrike/negotiate");
        if (!res.ok) {
          if (res.status !== 503) {
            console.warn("[useWrikeWebhookSync] Negotiate failed:", res.status);
          }
          return;
        }

        const body = (await res.json()) as { url?: string };
        if (!body.url || cancelled) return;

        const client = new WebPubSubClient(body.url);
        wpsClient = client;

        client.on("group-message", (e) => {
          if (e.message.group !== WPS_GROUP) return;
          const data = e.message.data as { taskId?: string };
          const taskId = data?.taskId;
          if (!taskId) return;

          onEvent?.(taskId);
          queryClient.invalidateQueries({ queryKey: ["platform", "issues"] });
          queryClient.invalidateQueries({ queryKey: ["platform", "issue", taskId] });
        });

        await client.start();
      } catch (err) {
        if (!cancelled) {
          console.error("[useWrikeWebhookSync] Failed to start Web PubSub client:", err);
        }
      }
    }

    void start();

    return () => {
      cancelled = true;
      wpsClient?.stop();
    };
  }, [enabled, queryClient, onEvent]);
}
