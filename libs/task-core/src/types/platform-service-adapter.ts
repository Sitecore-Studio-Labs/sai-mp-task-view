import type { UpdateTaskPayload } from "../contexts/EditTaskContext";
import type {
  AssigneeOption,
  CreateTaskPayload,
  CreateTaskResult,
  IssueTypeOption,
  PriorityOption,
} from "./create-task";
import type { PlatformUser } from "./display-types";
import type {
  AddCommentPayload,
  PlatformComment,
  PlatformCommentsResponse,
  PlatformProject,
  PlatformTask,
  PlatformTasksPageResponse,
  PlatformTransition,
  TaskFilters,
} from "./platform";

/**
 * Platform-agnostic server-side contract that every platform adapter must implement.
 * Route handlers receive this interface so they stay platform-independent; the
 * concrete implementation (e.g. JiraServiceAdapter) lives in apps/<platform>.
 */
export interface PlatformServiceAdapter {
  // ── Projects ──────────────────────────────────────────────────────────────
  getProjects(): Promise<PlatformProject[]>;

  // ── Tasks ─────────────────────────────────────────────────────────────────
  getTasks(
    projectKey: string,
    cursor?: string,
    filters?: Partial<TaskFilters>,
  ): Promise<PlatformTasksPageResponse>;
  getTask(taskId: string): Promise<PlatformTask>;
  createTask(payload: CreateTaskPayload): Promise<CreateTaskResult>;
  updateTask(taskId: string, payload: UpdateTaskPayload): Promise<PlatformTask>;
  /** Returns the HTTP status code (typically 204). */
  deleteTask(taskId: string): Promise<number>;

  // ── Metadata ──────────────────────────────────────────────────────────────
  getIssueTypes(projectId: string): Promise<IssueTypeOption[]>;
  getPriorities(): Promise<PriorityOption[]>;
  getProjectPriorities(projectId: string): Promise<PriorityOption[]>;
  getAssignees(params: { projectIdOrKey: string; query?: string }): Promise<AssigneeOption[]>;
  getCurrentUser(): Promise<PlatformUser>;
  getProjectStatuses(projectKey: string): Promise<Array<{ id: string; name: string }>>;

  // ── Task lifecycle ─────────────────────────────────────────────────────────
  getTransitions(taskId: string): Promise<PlatformTransition[]>;
  changeStatus(taskId: string, transitionId: string): Promise<void>;

  // ── Comments ──────────────────────────────────────────────────────────────
  getComments(taskId: string): Promise<PlatformCommentsResponse>;
  getComment(taskId: string, commentId: string): Promise<PlatformComment>;
  createComment(payload: AddCommentPayload): Promise<PlatformComment>;

  // ── Permissions ───────────────────────────────────────────────────────────
  getPermission(
    permission: string,
    options?: { issueKey?: string; projectKey?: string },
  ): Promise<boolean>;

  // ── Attachments ───────────────────────────────────────────────────────────
  getAttachmentContent(attachmentId: string): Promise<unknown>;
  addAttachment(
    taskId: string,
    file: { buffer: Buffer; fileName: string; mimeType: string },
  ): Promise<void>;
  deleteAttachment(attachmentId: string): Promise<void>;
}
