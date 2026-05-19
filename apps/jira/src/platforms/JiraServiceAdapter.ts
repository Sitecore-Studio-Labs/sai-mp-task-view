import type {
  AddCommentPayload,
  AssigneeOption,
  CreateTaskPayload,
  CreateTaskResult,
  IssueTypeOption,
  PlatformComment,
  PlatformCommentsResponse,
  PlatformProject,
  PlatformServiceAdapter,
  PlatformTask,
  PlatformTasksPageResponse,
  PlatformTransition,
  PlatformUser,
  PriorityOption,
  TaskFilters,
  UpdateTaskPayload,
} from "@mp/task-core";

import { normalizeComment, normalizeProject, normalizeTask } from "@/platforms/jira/generated";
import {
  addAttachmentToJiraIssue,
  createCommentForIssue,
  createJiraTaskForUser,
  deleteAttachmentForUser,
  deleteJiraIssue,
  getAttachmentContent,
  getCommentsForIssue,
  getDetailsForComment,
  getDetailsForIssue,
  getIssueTransitions,
  getJiraCurrentUser,
  getJiraIssuesForProject,
  getJiraIssueTypesForProject,
  getJiraPrioritiesForProject,
  getJiraPrioritiesForUser,
  getJiraProjectsForUser,
  getPermission,
  getProjectIssueStatuses,
  issueStatusChange,
  searchJiraAssigneesForUser,
  updateJiraTaskForUser,
  type UserId,
} from "@/services/jiraService";

export class JiraServiceAdapter implements PlatformServiceAdapter {
  constructor(private readonly userId: UserId) {}

  async getProjects(jiraSite?: string): Promise<PlatformProject[]> {
    const projects = await getJiraProjectsForUser(this.userId, jiraSite);
    return projects.map(normalizeProject);
  }

  async getTasks(
    projectKey: string,
    cursor?: string,
    filters?: Partial<TaskFilters>,
  ): Promise<PlatformTasksPageResponse> {
    const result = await getJiraIssuesForProject(this.userId, projectKey, cursor, filters);
    return {
      issues: result.issues.map(normalizeTask),
      nextPageToken: result.nextPageToken,
      isLast: result.isLast,
    };
  }

  async getTask(taskId: string): Promise<PlatformTask> {
    const issue = await getDetailsForIssue(this.userId, taskId);
    return normalizeTask(issue);
  }

  async createTask(payload: CreateTaskPayload): Promise<CreateTaskResult> {
    const task = await createJiraTaskForUser(this.userId, payload);
    return {
      id: task.id,
      key: task.key,
      summary: task.summary,
      projectId: task.projectId,
      projectKey: task.projectKey,
    };
  }

  async updateTask(taskId: string, payload: UpdateTaskPayload): Promise<PlatformTask> {
    // UpdateJiraTaskPayload.description doesn't accept null; convert to undefined (no-op).
    const issue = await updateJiraTaskForUser(this.userId, taskId, {
      ...payload,
      description: payload.description === null ? undefined : payload.description,
    });
    return normalizeTask(issue);
  }

  deleteTask(taskId: string): Promise<number> {
    return deleteJiraIssue(this.userId, taskId);
  }

  getIssueTypes(projectId: string): Promise<IssueTypeOption[]> {
    return getJiraIssueTypesForProject(this.userId, projectId);
  }

  getPriorities(): Promise<PriorityOption[]> {
    return getJiraPrioritiesForUser(this.userId);
  }

  getProjectPriorities(projectId: string): Promise<PriorityOption[]> {
    return getJiraPrioritiesForProject(this.userId, projectId);
  }

  async getAssignees(params: {
    projectIdOrKey: string;
    query?: string;
  }): Promise<AssigneeOption[]> {
    const users = await searchJiraAssigneesForUser(this.userId, params);
    return users.map((u) => ({
      id: u.accountId,
      displayName: u.displayName,
      avatarUrl: u.avatarUrls?.["48x48"],
    }));
  }

  getCurrentUser(): Promise<PlatformUser> {
    return getJiraCurrentUser(this.userId);
  }

  getProjectStatuses(projectKey: string) {
    return getProjectIssueStatuses(this.userId, projectKey);
  }

  getTransitions(taskId: string): Promise<PlatformTransition[]> {
    return getIssueTransitions(taskId, this.userId) as Promise<PlatformTransition[]>;
  }

  async changeStatus(taskId: string, transitionId: string): Promise<void> {
    await issueStatusChange(taskId, transitionId, this.userId);
  }

  async getComment(taskId: string, commentId: string): Promise<PlatformComment> {
    const comment = await getDetailsForComment(this.userId, taskId, commentId);
    return normalizeComment(comment);
  }

  async getComments(taskId: string): Promise<PlatformCommentsResponse> {
    const result = await getCommentsForIssue(this.userId, taskId);
    return {
      startAt: result.startAt,
      maxResults: result.maxResults,
      total: result.total,
      comments: result.comments.map(normalizeComment),
    };
  }

  async createComment(payload: AddCommentPayload): Promise<PlatformComment> {
    const comment = await createCommentForIssue(this.userId, {
      issueIdOrKey: payload.issueIdOrKey,
      text: payload.text,
      replyToCommentId: payload.replyToCommentId,
      replyToAuthorAccountId: payload.replyToAuthorId,
      replyToAuthorDisplayName: payload.replyToAuthorDisplayName,
    });
    return normalizeComment(comment);
  }

  getPermission(
    permission: string,
    options?: { issueKey?: string; projectKey?: string },
  ): Promise<boolean> {
    return getPermission(this.userId, permission, options);
  }

  getAttachmentContent(attachmentId: string): Promise<unknown> {
    return getAttachmentContent(attachmentId, this.userId);
  }

  addAttachment(
    taskId: string,
    file: { buffer: Buffer; fileName: string; mimeType: string },
  ): Promise<void> {
    return addAttachmentToJiraIssue(this.userId, taskId, file);
  }

  deleteAttachment(attachmentId: string): Promise<void> {
    return deleteAttachmentForUser(this.userId, attachmentId);
  }
}
