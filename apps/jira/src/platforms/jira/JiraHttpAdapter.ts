import type { PlatformToken } from "@mp/task-core";

import type {
  CreateJiraTaskPayload,
  JiraIssue,
  JiraIssueType,
  JiraPriority,
  JiraProject,
  JiraTask,
  JiraUser,
  UpdateJiraTaskPayload,
} from "@/types/jira";

/**
 * Jira HTTP API contract — methods the JiraAdapter class must implement.
 * Named after the underlying protocol (HTTP) to distinguish it from the
 * platform-agnostic PlatformServiceAdapter in libs/task-core.
 */
export interface JiraHttpAdapter {
  authenticate(authCode: string, redirectUri: string): Promise<PlatformToken>;
  refreshToken(token: PlatformToken): Promise<PlatformToken>;
  getProjects(token: PlatformToken): Promise<JiraProject[]>;
  getIssueTypes(token: PlatformToken, projectIdOrKey: string): Promise<JiraIssueType[]>;
  getPriorities(token: PlatformToken): Promise<JiraPriority[]>;
  searchAssignees(
    token: PlatformToken,
    params: { projectIdOrKey: string; query?: string },
  ): Promise<JiraUser[]>;
  createTask(token: PlatformToken, payload: CreateJiraTaskPayload): Promise<JiraTask>;
  updateTask(
    token: PlatformToken,
    issueIdOrKey: string,
    payload: UpdateJiraTaskPayload,
  ): Promise<JiraIssue>;
  deleteAttachment(token: PlatformToken, attachmentId: string): Promise<void>;
}
