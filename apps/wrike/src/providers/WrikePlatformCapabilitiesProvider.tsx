"use client";

import type { PlatformCapabilities, PlatformSetupScopeConfig } from "@mp/task-core";
import { PlatformCapabilitiesProvider } from "@mp/task-core";
import type { ReactNode } from "react";

export const WRIKE_SETUP_SCOPE: PlatformSetupScopeConfig = {
  scopeLevels: [
    { id: "folder", label: "Folder", listSource: "folders" as const, isTaskListScope: true },
  ],
  taskListScopeLevelId: "folder",
  externalResourceMappings: true,
};

export const WRIKE_CAPABILITIES: PlatformCapabilities = {
  platformName: "wrike",
  platformDisplayName: "Wrike",
  platformLogo: null,
  connectionTitle: "Connect to Wrike",
  connectionDescription:
    "Link your Wrike account to manage tasks directly from the editor sidebar.",
  hasIssueTypes: false,
  hasPriorities: true,
  hasAssignees: true,
  hasDueDate: true,
  hasParentIssue: true,
  hasAttachments: true,
  hasComments: true,
  hasSubtasks: true,
  hasStatusTransitions: true,
  hasAiWorkBreakdown: false,
  hasCommentReplies: false,
  richTextFormat: "plain",
  dueDateDisplay: "datetime",
  setupScope: WRIKE_SETUP_SCOPE,
};

export function WrikePlatformCapabilitiesProvider({ children }: { children: ReactNode }) {
  return (
    <PlatformCapabilitiesProvider value={WRIKE_CAPABILITIES}>
      {children}
    </PlatformCapabilitiesProvider>
  );
}
