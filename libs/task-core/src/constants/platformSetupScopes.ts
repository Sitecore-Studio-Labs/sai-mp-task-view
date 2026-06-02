import type { PlatformSetupScopeConfig } from "../types/setup-scope";

/** Mirrors `capabilities/jira.yaml` → setup block. */
export const JIRA_SETUP_SCOPE: PlatformSetupScopeConfig = {
  scopeLevels: [
    { id: "site", label: "Site", listSource: "sites" },
    {
      id: "project",
      label: "Project",
      listSource: "projects",
      parentLevelId: "site",
      isTaskListScope: true,
    },
  ],
  taskListScopeLevelId: "project",
  externalResourceMappings: true,
};

/** Mirrors `capabilities/wrike.yaml` → setup block. */
export const WRIKE_SETUP_SCOPE: PlatformSetupScopeConfig = {
  scopeLevels: [
    {
      id: "folder",
      label: "Folder",
      listSource: "folders",
      isTaskListScope: true,
    },
  ],
  taskListScopeLevelId: "folder",
  externalResourceMappings: true,
};

/** Mirrors `capabilities/monday.yaml` → setup block. */
export const MONDAY_SETUP_SCOPE: PlatformSetupScopeConfig = {
  scopeLevels: [
    {
      id: "board",
      label: "Board",
      listSource: "boards",
      isTaskListScope: true,
    },
  ],
  taskListScopeLevelId: "board",
  externalResourceMappings: true,
};

/** Lookup by platform slug — used in tests and shared wiring. */
export const PLATFORM_SETUP_SCOPES: Record<string, PlatformSetupScopeConfig> = {
  jira: JIRA_SETUP_SCOPE,
  wrike: WRIKE_SETUP_SCOPE,
  monday: MONDAY_SETUP_SCOPE,
};

export function getPlatformSetupScope(platformName: string): PlatformSetupScopeConfig | undefined {
  return PLATFORM_SETUP_SCOPES[platformName];
}
