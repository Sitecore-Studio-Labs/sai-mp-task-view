import type { PlatformToken } from "@mp/task-core";

import type {
  CreateCommentPayload,
  CreateJiraTaskPayload,
  GetCommentsForIssueResponse,
  JiraComment,
  JiraIssue,
  JiraIssueFilters,
  JiraIssueType,
  JiraPriority,
  JiraProject,
  JiraProjectIssuesResponse,
  JiraTask,
  JiraUser,
  UpdateJiraTaskPayload,
} from "@/types/jira";

/**
 * Jira HTTP API contract — every public method JiraAdapter implements must be declared here.
 * Named after the underlying protocol (HTTP) to distinguish it from the
 * platform-agnostic PlatformServiceAdapter in libs/task-core.
 */
export interface JiraHttpAdapter {
  // ── Auth ─────────────────────────────────────────────────────────────────────
  authenticate(authCode: string, redirectUri: string): Promise<PlatformToken>;
  refreshToken(token: PlatformToken): Promise<PlatformToken>;

  // ── User ─────────────────────────────────────────────────────────────────────
  getMyself(token: PlatformToken): Promise<JiraUser>;

  // ── Projects ─────────────────────────────────────────────────────────────────
  getProjects(token: PlatformToken): Promise<JiraProject[]>;

  // ── Issues (list + detail) ───────────────────────────────────────────────────
  getProjectIssues(
    token: PlatformToken,
    projectKey: string,
    cursor?: string,
    filters?: JiraIssueFilters,
  ): Promise<JiraProjectIssuesResponse>;
  getIssueDetails(token: PlatformToken, issueIdOrKey: string): Promise<JiraIssue>;
  createTask(token: PlatformToken, payload: CreateJiraTaskPayload): Promise<JiraTask>;
  updateTask(
    token: PlatformToken,
    issueIdOrKey: string,
    payload: UpdateJiraTaskPayload,
  ): Promise<JiraIssue>;
  deleteIssue(token: PlatformToken, issueIdOrKey: string): Promise<number>;

  // ── Issue metadata ────────────────────────────────────────────────────────────
  getIssueTypes(token: PlatformToken, projectId: string): Promise<JiraIssueType[]>;
  getPriorities(token: PlatformToken): Promise<JiraPriority[]>;
  getPrioritiesForProject(
    token: PlatformToken,
    projectKey: string,
    issueTypeId?: string,
  ): Promise<JiraPriority[]>;
  searchAssignees(
    token: PlatformToken,
    params: { projectIdOrKey: string; query?: string },
  ): Promise<JiraUser[]>;
  getProjectIssueStatuses(token: PlatformToken, projectKey: string): Promise<unknown>;
  getPermission(
    token: PlatformToken,
    permission: string,
    options?: { issueKey?: string; projectKey?: string },
  ): Promise<boolean>;

  // ── Status transitions ────────────────────────────────────────────────────────
  getIssueTransitions(token: PlatformToken, issueIdOrKey: string): Promise<unknown>;
  issueStatusChange(
    token: PlatformToken,
    issueIdOrKey: string,
    transitionId: string,
  ): Promise<void>;

  // ── Comments ─────────────────────────────────────────────────────────────────
  getIssueComments(
    token: PlatformToken,
    issueIdOrKey: string,
  ): Promise<GetCommentsForIssueResponse>;
  getCommentDetails(
    token: PlatformToken,
    issueIdOrKey: string,
    commentId: string,
  ): Promise<JiraComment>;
  createComment(token: PlatformToken, payload: CreateCommentPayload): Promise<unknown>;

  // ── Attachments ───────────────────────────────────────────────────────────────
  addAttachment(
    token: PlatformToken,
    issueIdOrKey: string,
    file: { buffer: Buffer; fileName: string; mimeType: string },
  ): Promise<void>;
  deleteAttachment(token: PlatformToken, attachmentId: string): Promise<void>;
  getAttachmentContent(
    token: PlatformToken,
    attachmentId: string,
  ): Promise<{ data: ArrayBuffer; contentType: string }>;

  // ── Webhooks ──────────────────────────────────────────────────────────────────
  registerWebhooks(
    token: PlatformToken,
    callbackUrl: string,
    webhooks: Array<{ events: string[]; jqlFilter?: string }>,
  ): Promise<Array<{ createdWebhookId?: number; errors?: string[] }>>;
}
