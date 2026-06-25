import { mapAssignee } from "@mp/shared";
import type {
  AddCommentPayload,
  AssigneeOption,
  CreateTaskPayload,
  CreateTaskResult,
  IssueTypeOption,
  PlatformComment,
  PlatformCommentsResponse,
  PlatformProject,
  PlatformProjectStatuses,
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
import { jiraStatusToPlatformStatus } from "@/platforms/jira/jiraStatusColors";
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
import type { JiraIssue } from "@/types/jira";

export class JiraServiceAdapter implements PlatformServiceAdapter {
  constructor(private readonly userId: UserId) {}

  private normalizeJiraTask(issue: JiraIssue): PlatformTask {
    const task = normalizeTask(issue);
    return {
      ...task,
      fields: {
        ...task.fields,
        status: jiraStatusToPlatformStatus(issue.fields.status),
        subtasks: issue.fields.subtasks?.map((subtask) => this.normalizeJiraTask(subtask)),
      },
    };
  }

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
      issues: result.issues.map((issue) => this.normalizeJiraTask(issue)),
      nextPageToken: result.nextPageToken,
      isLast: result.isLast,
    };
  }

  async getTask(taskId: string): Promise<PlatformTask> {
    const issue = await getDetailsForIssue(this.userId, taskId);
    return this.normalizeJiraTask(issue);
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
    return this.normalizeJiraTask(issue);
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
    return users.flatMap((u) => {
      const assignee = mapAssignee({
        accountId: u.accountId,
        displayName: u.displayName,
        avatarUrl: u.avatarUrls?.["48x48"],
      });
      return assignee ? [assignee] : [];
    });
  }

  getCurrentUser(): Promise<PlatformUser> {
    return getJiraCurrentUser(this.userId);
  }

  async getProjectStatuses(projectKey: string): Promise<PlatformProjectStatuses[]> {
    const groups = await getProjectIssueStatuses(this.userId, projectKey);
    return groups.map((group) => ({
      ...group,
      statuses: group.statuses.map((status) => jiraStatusToPlatformStatus(status)),
    }));
  }

  async getTransitions(taskId: string): Promise<PlatformTransition[]> {
    const transitions = await getIssueTransitions(taskId, this.userId);
    return (transitions as Array<PlatformTransition & { to: JiraIssue["fields"]["status"] }>).map(
      (transition) => ({
        ...transition,
        to: jiraStatusToPlatformStatus(transition.to),
      }),
    );
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
