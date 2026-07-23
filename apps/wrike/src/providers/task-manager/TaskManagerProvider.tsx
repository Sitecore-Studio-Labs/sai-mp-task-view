"use client";

import { useTaskManager } from "@mp/task-core";
import { GenericTaskManagerProvider, useOAuthPopupHandler, usePageContext } from "@mp/ui";
import { type ReactNode } from "react";

import { useWrikeWebhookSync } from "@/hooks/useWrikeWebhookSync";

import { WRIKE_CAPABILITIES } from "../WrikePlatformCapabilitiesProvider";

export type { TaskManagerView } from "@mp/task-core";
export { useTaskManager } from "@mp/task-core";

function WrikeRealtimeSync() {
  const { effectiveProjectKey, connected } = useTaskManager();
  useWrikeWebhookSync(effectiveProjectKey, connected);
  return null;
}

export function TaskManagerProvider({ children }: { children: ReactNode }) {
  const pageContext = usePageContext();

  useOAuthPopupHandler({
    platform: WRIKE_CAPABILITIES.platformName,
    invalidateKeys: [
      ["platform", "connectionStatus"],
      ["platform", "projects"],
      ["platform", "currentUser"],
    ],
    successMessage: "Wrike connected successfully.",
  });

  return (
    <GenericTaskManagerProvider pageContext={pageContext}>
      <WrikeRealtimeSync />
      {children}
    </GenericTaskManagerProvider>
  );
}
