import type { PlatformToken } from "@/types/platform";
import type {
  PlatformAttachment,
  PlatformComment,
  PlatformCommentsResponse,
  PlatformCreateCommentPayload,
  PlatformCreateTaskPayload,
  PlatformIssueType,
  PlatformPriority,
  PlatformProject,
  PlatformStatus,
  PlatformTask,
  PlatformTaskFilters,
  PlatformTaskListResponse,
  PlatformTransition,
  PlatformUpdateTaskPayload,
  PlatformUser,
} from "@/types/platform-entities";

export interface PlatformAdapter {
  authenticate(authCode: string, redirectUri: string): Promise<PlatformToken>;
  refreshToken(token: PlatformToken): Promise<PlatformToken>;

  getCurrentUser(token: PlatformToken): Promise<PlatformUser>;
  getProjects(token: PlatformToken): Promise<PlatformProject[]>;
  getIssueTypes(token: PlatformToken, projectId: string): Promise<PlatformIssueType[]>;
  getPriorities(token: PlatformToken, projectId?: string): Promise<PlatformPriority[]>;
  getStatuses(token: PlatformToken, projectId: string): Promise<PlatformStatus[]>;
  searchAssignees(
    token: PlatformToken,
    params: { projectId: string; query?: string },
  ): Promise<PlatformUser[]>;

  getTasks(
    token: PlatformToken,
    projectId: string,
    cursor?: string,
    filters?: PlatformTaskFilters,
  ): Promise<PlatformTaskListResponse>;
  getTaskDetails(token: PlatformToken, taskId: string): Promise<PlatformTask>;
  createTask(token: PlatformToken, payload: PlatformCreateTaskPayload): Promise<PlatformTask>;
  updateTask(
    token: PlatformToken,
    taskId: string,
    payload: PlatformUpdateTaskPayload,
  ): Promise<PlatformTask>;
  deleteTask(token: PlatformToken, taskId: string): Promise<void>;

  getComments(token: PlatformToken, taskId: string): Promise<PlatformCommentsResponse>;
  createComment(
    token: PlatformToken,
    payload: PlatformCreateCommentPayload,
  ): Promise<PlatformComment>;

  getTransitions(token: PlatformToken, taskId: string): Promise<PlatformTransition[]>;
  changeStatus(token: PlatformToken, taskId: string, transitionOrStatusId: string): Promise<void>;

  uploadAttachment(
    token: PlatformToken,
    taskId: string,
    file: { buffer: Buffer; fileName: string; mimeType: string },
  ): Promise<PlatformAttachment>;
  getAttachmentContent(
    token: PlatformToken,
    attachmentId: string,
  ): Promise<{ data: ArrayBuffer; contentType: string }>;
  deleteAttachment(token: PlatformToken, attachmentId: string): Promise<void>;
}
