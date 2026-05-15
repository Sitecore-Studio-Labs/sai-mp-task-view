import type { BrowserContext, Page } from "@playwright/test";

/**
 * Mirrors platform capability booleans needed to decide which behavioural E2Es apply.
 */
export interface TaskPlatformCapabilityFlags {
  hasIssueTypes: boolean;
  hasPriorities: boolean;
  hasAssignees: boolean;
  hasDueDate: boolean;
  hasParentIssue: boolean;
  hasAttachments: boolean;
  hasComments: boolean;
  hasSubtasks: boolean;
  hasStatusTransitions: boolean;
  hasAiWorkBreakdown: boolean;
  hasSites: boolean;
}

/**
 * Implemented per platform inside `apps/<platform>-e2e` (routes, cookies, mocks).
 * Scenarios live in this library and call into the harness.
 */
export interface PlatformTaskE2EHarness {
  /** YAML `platform.name`, e.g. `jira` */
  readonly platformKey: string;
  /** YAML `platform.displayName` — used for `Connected to …` assertions */
  readonly platformDisplayName: string;
  /**
   * Value passed through `window.postMessage` as `platform` so it matches `useOAuthPopupHandler`.
   * Must stay aligned with the app’s `{ SYSTEMS.XXX }` constant (typically the display name).
   */
  readonly oauthPopupPlatformLabel: string;
  /** Cookie set by OAuth callback helpers in the Next app (`{platformKey}_session_token`). */
  readonly sessionCookieName: string;
  /** Task manager route (normally `/task-manager-extension`). */
  readonly extensionPath: string;
  readonly capabilities: TaskPlatformCapabilityFlags;

  /**
   * When true, `@mp/task-e2e` task-flow suites (list/create/edit/details/delete)
   * run against `installTaskFlowMocks`; keep false until the harness implements them.
   */
  readonly supportsTaskFlowMocks: boolean;

  navigateToExtension(page: Page): Promise<void>;
  simulateOAuthCompletion(page: Page): Promise<void>;
  seedSessionCookie(context: BrowserContext, baseURL: string, token?: string): Promise<void>;

  /**
   * Minimal auth route mocks used by Connect scenarios (`/api/auth/<platform>/status`).
   */
  attachConnectLifecycleMocks?(page: Page): Promise<void>;
  /**
   * Flip `/status` mocked response without restarting the page route (Connect suite).
   */
  setBackendReportsConnected?(page: Page, connected: boolean): Promise<void>;

  /**
   * Disconnect/reconnect scenarios: mocked `/disconnect`, reactive `/status`,
   * and optional OAuth popup containment.
   */
  attachDisconnectFlowMocks?(
    browserContext: BrowserContext,
    page: Page,
    baseURL: string,
  ): Promise<void>;
  suppressRealOAuthPopups?(page: Page): Promise<void>;

  /** Full mocks for list + CRUD flows — implement later in generated harness stubs. */
  installTaskFlowMocks?(page: Page): Promise<void>;
}
