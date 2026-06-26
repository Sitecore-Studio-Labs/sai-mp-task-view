import type { ReactNode } from "react";

import type { PlatformSetupScopeConfig } from "./setup-scope";

/**
 * Declares what a specific task management platform supports.
 * Consumed by shared UI components to conditionally render platform-specific sections.
 * Platform integrations provide this via PlatformCapabilitiesProvider.
 */
export interface PlatformCapabilities {
  /** Unique machine-readable platform key (e.g. "jira", "asana"). */
  platformName: string;
  /** Human-readable platform name (e.g. "Jira", "Asana"). */
  platformDisplayName: string;
  /** Platform logo rendered on the connection screen. */
  platformLogo?: ReactNode;
  /** Title shown on the not-connected screen (e.g. "Connect to Jira"). */
  connectionTitle: string;
  /** Description shown on the not-connected screen. */
  connectionDescription: string;

  // ── Feature flags ──────────────────────────────────────────────────────────
  /** Platform exposes issue/task types (e.g. Epic, Story, Bug). */
  hasIssueTypes: boolean;
  /** Platform exposes priority levels. */
  hasPriorities: boolean;
  /** Platform supports assigning tasks to users. */
  hasAssignees: boolean;
  /** Platform supports due dates. */
  hasDueDate: boolean;
  /** Platform supports parent/child issue hierarchy. */
  hasParentIssue: boolean;
  /** Platform supports file attachments on tasks. */
  hasAttachments: boolean;
  /** Platform supports comments on tasks. */
  hasComments: boolean;
  /** Platform supports replying to comments (mention or threaded reply). */
  hasCommentReplies: boolean;
  /** Platform supports sub-tasks. */
  hasSubtasks: boolean;
  /** Platform supports status transitions (e.g. To Do → In Progress). */
  hasStatusTransitions: boolean;
  /** AI work breakdown feature is enabled for this platform integration. */
  hasAiWorkBreakdown: boolean;

  /**
   * Which task field to show as the human-readable identifier in list/detail UI.
   * Use "summary" when platform keys are opaque IDs (e.g. Wrike task IDs).
   * Defaults to "key" (e.g. Jira issue keys like PROJ-123).
   */
  taskKeyDisplay?: "key" | "summary";

  /**
   * How due dates from the platform should be shown in read-only UI.
   * - date: calendar date only (e.g. Jira `yyyy-MM-dd`)
   * - datetime: date and time when the value includes a meaningful time
   */
  dueDateDisplay: "date" | "datetime";

  /** Rich-text format used by the platform for descriptions/comments. */
  richTextFormat: "adf" | "markdown" | "plain";

  /** Setup wizard scope hierarchy; undefined when hasSetupWizard is false. */
  setupScope?: PlatformSetupScopeConfig;
}
