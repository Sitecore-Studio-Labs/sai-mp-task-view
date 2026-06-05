export interface PlatformE2eConfig {
  /** Platform slug from capabilities YAML (e.g. "jira" → connect-to-jira). */
  platformName: string;

  /** Route to the task manager extension page. */
  taskManagerPath: string;

  /** Override when the app uses a custom connect button testId (e.g. connect-jira-account). */
  connectButtonTestId?: string;

  hasSites: boolean;
  hasSetupWizard: boolean;
  hasIssueTypes: boolean;
  hasPriorities: boolean;
  hasAssignees: boolean;
  hasDueDate: boolean;
  hasParentIssue: boolean;
  hasExternalResourceMappings: boolean;

  /** Scope level ids from setup YAML (e.g. ["site", "project"] or ["folder"]). */
  setupScopeLevelIds: string[];

  /** Id of the level used for the task list (e.g. "project" | "folder"). */
  taskListScopeLevelId: string;

  /** testIdPrefix for PlatformSetupScopePicker (default: "scope-picker"). */
  setupScopePickerTestId?: string;
}
