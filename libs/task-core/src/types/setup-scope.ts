/** Where scope options are loaded from (maps to existing BFF list routes). */
export type SetupScopeListSource = "sites" | "projects" | "folders" | "boards" | "workspaces";

/** One level in the setup wizard hierarchy (e.g. Jira site → project). */
export interface SetupScopeLevel {
  /** Stable key used in scopeSelections (e.g. "site", "project", "board"). */
  id: string;
  /** Human-readable label for the dropdown. */
  label: string;
  /** BFF route alias that supplies options for this level. */
  listSource: SetupScopeListSource;
  /** Parent level id when options depend on a prior selection. */
  parentLevelId?: string;
  /** Marks the leaf level whose key gates the task list. */
  isTaskListScope?: boolean;
}

/** Declarative setup hierarchy for a platform (from capabilities YAML). */
export interface PlatformSetupScopeConfig {
  scopeLevels: SetupScopeLevel[];
  /** Must match a scopeLevels[].id with isTaskListScope: true. */
  taskListScopeLevelId: string;
  /** Whether step 2 external-resource → scope mappings are shown. */
  externalResourceMappings?: boolean;
}

/** A single selected scope value persisted in setup.scopeSelections. */
export interface PlatformScopeSelection {
  id: string;
  key: string;
  name: string;
  meta?: Record<string, unknown>;
}
