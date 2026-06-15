"use client";

import { SYSTEMS } from "@mp/task-core";
import { GenericTaskManagerProvider, useOAuthPopupHandler, usePageContext } from "@mp/ui";
import { type ReactNode } from "react";

// Re-export useTaskManager from @mp/task-core so all components share the same context instance.
export type { TaskManagerView } from "@mp/task-core";
export { useTaskManager } from "@mp/task-core";

export function TaskManagerProvider({ children }: { children: ReactNode }) {
  const pageContext = usePageContext();

  // TODO: Replace invalidateKeys with the platform-specific connection/sites/projects query keys.
  useOAuthPopupHandler({
    platform: SYSTEMS.WRIKE,
    invalidateKeys: [],
    successMessage: "Wrike connected successfully.",
  });

  return (
    <GenericTaskManagerProvider pageContext={pageContext}>{children}</GenericTaskManagerProvider>
  );
}
