"use client";

import { GenericTaskManagerProvider, useOAuthPopupHandler, usePageContext } from "@mp/ui";
import { type ReactNode } from "react";

import { WRIKE_CAPABILITIES } from "../WrikePlatformCapabilitiesProvider";

export type { TaskManagerView } from "@mp/task-core";
export { useTaskManager } from "@mp/task-core";

export function TaskManagerProvider({ children }: { children: ReactNode }) {
  const pageContext = usePageContext();

  useOAuthPopupHandler({
    platform: WRIKE_CAPABILITIES.platformName,
    invalidateKeys: [],
    successMessage: "Wrike connected successfully.",
  });

  return (
    <GenericTaskManagerProvider pageContext={pageContext}>{children}</GenericTaskManagerProvider>
  );
}
