"use client";

import { SYSTEMS } from "@mp/task-core";
import { GenericTaskManagerProvider, useOAuthPopupHandler, usePageContext } from "@mp/ui";
import { type ReactNode } from "react";

import {
  JIRA_PROJECTS_QUERY_KEY,
  JIRA_SITES_QUERY_KEY,
  JIRA_STATUS_QUERY_KEY,
} from "@/hooks/useJiraConnectionStatus";

export type { TaskManagerView } from "@mp/task-core";
export { useTaskManager } from "@mp/task-core";

export function TaskManagerProvider({ children }: { children: ReactNode }) {
  const pageContext = usePageContext();

  useOAuthPopupHandler({
    platform: SYSTEMS.JIRA,
    invalidateKeys: [
      JIRA_STATUS_QUERY_KEY,
      JIRA_PROJECTS_QUERY_KEY,
      JIRA_SITES_QUERY_KEY,
      ["jira", "currentUser"],
    ],
    successMessage: "Jira connected successfully.",
  });

  return (
    <GenericTaskManagerProvider pageContext={pageContext}>{children}</GenericTaskManagerProvider>
  );
}
