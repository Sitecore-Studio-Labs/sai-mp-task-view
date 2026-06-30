export interface PlatformE2eConfig {
  /** Platform slug from capabilities YAML (e.g. "jira" → connect-to-jira). */
  platformName: string;

  /** Route to the task manager extension page. */
  taskManagerPath: string;

  /** Heading shown on the disconnected connection screen (e.g. "Connect to Jira"). */
  connectionTitle?: string;

  /** When true, the connection screen should render a platform logo (see platformLogo in capabilities). */
  hasPlatformLogo?: boolean;

  /** Label in the connection status bar (e.g. "Jira" → "Connected to Jira"). */
  platformDisplayName?: string;

  /** Value sent in simulated OAuth postMessage (e.g. "Jira" from SYSTEMS.JIRA). */
  oauthMessagePlatform?: string;

  /** Session cookie name set after OAuth (e.g. "jira_session_token"). */
  sessionCookieName?: string;

  /** Override when the app uses a custom connect button testId (e.g. connect-jira-account). */
  connectButtonTestId?: string;

  /**
   * Connection status API path used while the gate shows a loader
   * (e.g. "/api/auth/jira/status"). When set, gotoTaskManager waits for this response.
   */
  connectionStatusApiPath?: string;

  /** Disconnect API path to mock (e.g. "/api/auth/jira/disconnect"). */
  disconnectApiPath?: string;

  /** Setup API path to mock for connected-state tests (e.g. "/api/setup"). */
  setupApiPath?: string;

  hasSites: boolean;
  hasSetupWizard: boolean;
  hasIssueTypes: boolean;
  hasPriorities: boolean;
  hasAssignees: boolean;
  hasDueDate: boolean;
  hasParentIssue: boolean;
  hasComments?: boolean;
  hasSubtasks?: boolean;
  hasStatusTransitions?: boolean;
  hasExternalResourceMappings: boolean;

  /** Scope level ids from setup YAML (e.g. ["site", "project"] or ["folder"]). */
  setupScopeLevelIds: string[];

  /** Id of the level used for the task list (e.g. "project" | "folder"). */
  taskListScopeLevelId: string;

  /** Rich-text format for mocked issue descriptions and comments (from capabilities YAML). */
  richTextFormat: "adf" | "markdown" | "plain";

  /** testIdPrefix for PlatformSetupScopePicker (default: "scope-picker"). */
  setupScopePickerTestId?: string;
}
