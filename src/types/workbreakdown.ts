/**
 * Internal work breakdown model: Epic → Story → Task → Subtask.
 * Used by AI parser, draft API, and UI. Platform adapters map this to Jira/Asana/Trello.
 */

export type WorkItemType = "epic" | "story" | "task" | "subtask";

export interface WorkItemMetadata {
  priority?: string;
  assigneeHint?: string;
  /** Platform-specific issue type id (set after mapping or user edit). */
  issueTypeId?: string;
  /** Acceptance criteria: measurable conditions for done. */
  acceptanceCriteria?: string[];
  [key: string]: unknown;
}

/** Single node in the work breakdown tree (nested). */
export interface WorkItem {
  id: string;
  type: WorkItemType;
  title: string;
  description: string;
  children: WorkItem[];
  metadata?: WorkItemMetadata;
  /** Set after publishing to platform. */
  externalKey?: string;
}

/** Root work breakdown: list of top-level items (epics or stories). */
export interface WorkBreakdown {
  id: string;
  /** Optional context when generated (e.g. project key). */
  projectKey?: string;
  platform?: string;
  status: "draft" | "approved" | "published";
  items: WorkItem[];
  createdAt: string;
  updatedAt: string;
}

/** Request body for parse-requirements. */
export interface ParseRequirementsBody {
  requirementText: string;
  projectKey?: string;
  platform?: string;
}

/** Response from parse-requirements: validated and normalized breakdown. */
export interface ParseRequirementsResponse {
  draftId: string;
  workBreakdown: WorkBreakdown;
}
