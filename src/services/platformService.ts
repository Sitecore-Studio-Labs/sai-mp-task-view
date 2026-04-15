import { createSupabaseServerClient } from "@/lib/supabaseClient";
import type { PlatformAdapter } from "@/platforms/base/PlatformAdapter";
import { createJiraAdapterForUser } from "@/services/jiraService";
import { createWrikeAdapterForUser } from "@/services/wrikeService";
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
  PlatformType,
  PlatformUpdateTaskPayload,
  PlatformUser,
} from "@/types/platform-entities";

export type UserId = string;

export interface PlatformConnection {
  platform: PlatformType;
  adapter: PlatformAdapter;
  token: PlatformToken;
  connectionId: string;
  /** Jira cloudId or Wrike host */
  site: string;
  /** Jira project key or Wrike folder ID */
  projectId: string;
}

/**
 * Detect which platform the user is connected to.
 * Until Phase 3 adds a `platform` column, this defaults to "jira".
 * TODO: Phase 3 — read `platform` column from `platform_connections`.
 */
async function detectPlatform(_userId: string): Promise<PlatformType> {
  const supabase = createSupabaseServerClient();

  const { data } = await supabase
    .from("jira_connections")
    .select("jira_site")
    .eq("user_id", _userId)
    .eq("status", "active")
    .maybeSingle();

  if (!data) return "jira";

  // After Phase 3, this will read a `platform` column directly.
  // For now, we default to "jira" since only Jira connections exist.
  return "jira";
}

/**
 * Creates the appropriate adapter for a user based on their connected platform.
 * This is the main entry point for platform-neutral API routes.
 */
export async function createAdapterForUser(userId: UserId): Promise<PlatformConnection> {
  const platform = await detectPlatform(userId);

  if (platform === "wrike") {
    const { adapter, token, connectionId, host, projectId } =
      await createWrikeAdapterForUser(userId);
    return {
      platform: "wrike",
      adapter: adapter as PlatformAdapter,
      token,
      connectionId,
      site: host,
      projectId,
    };
  }

  const { adapter, token, connectionId, jiraSite } = await createJiraAdapterForUser(userId);
  return {
    platform: "jira",
    adapter,
    token,
    connectionId,
    site: jiraSite,
    projectId: "",
  };
}

// ── Platform-neutral service wrappers ────────────────────────────

export async function getProjectsForUser(userId: UserId): Promise<PlatformProject[]> {
  const { adapter, token } = await createAdapterForUser(userId);
  return adapter.getProjects(token);
}

export async function getIssueTypesForProject(
  userId: UserId,
  projectId: string,
): Promise<PlatformIssueType[]> {
  const { adapter, token } = await createAdapterForUser(userId);
  return adapter.getIssueTypes(token, projectId);
}

export async function getPrioritiesForUser(
  userId: UserId,
  projectId?: string,
): Promise<PlatformPriority[]> {
  const { adapter, token } = await createAdapterForUser(userId);
  return adapter.getPriorities(token, projectId);
}

export async function getStatusesForProject(
  userId: UserId,
  projectId: string,
): Promise<PlatformStatus[]> {
  const { adapter, token } = await createAdapterForUser(userId);
  return adapter.getStatuses(token, projectId);
}

export async function searchAssigneesForUser(
  userId: UserId,
  params: { projectId: string; query?: string },
): Promise<PlatformUser[]> {
  const { adapter, token } = await createAdapterForUser(userId);
  return adapter.searchAssignees(token, params);
}

export async function getCurrentUserForPlatform(userId: UserId): Promise<PlatformUser> {
  const { adapter, token } = await createAdapterForUser(userId);
  return adapter.getCurrentUser(token);
}

export async function getTasksForProject(
  userId: UserId,
  projectId: string,
  cursor?: string,
  filters?: PlatformTaskFilters,
): Promise<PlatformTaskListResponse> {
  const { adapter, token } = await createAdapterForUser(userId);
  return adapter.getTasks(token, projectId, cursor, filters);
}

export async function getTaskDetailsForUser(userId: UserId, taskId: string): Promise<PlatformTask> {
  const { adapter, token } = await createAdapterForUser(userId);
  return adapter.getTaskDetails(token, taskId);
}

export async function createTaskForUser(
  userId: UserId,
  payload: PlatformCreateTaskPayload,
): Promise<PlatformTask> {
  const { adapter, token } = await createAdapterForUser(userId);
  return adapter.createTask(token, payload);
}

export async function updateTaskForUser(
  userId: UserId,
  taskId: string,
  payload: PlatformUpdateTaskPayload,
): Promise<PlatformTask> {
  const { adapter, token } = await createAdapterForUser(userId);
  return adapter.updateTask(token, taskId, payload);
}

export async function deleteTaskForUser(userId: UserId, taskId: string): Promise<void> {
  const { adapter, token } = await createAdapterForUser(userId);
  return adapter.deleteTask(token, taskId);
}

export async function getCommentsForTask(
  userId: UserId,
  taskId: string,
): Promise<PlatformCommentsResponse> {
  const { adapter, token } = await createAdapterForUser(userId);
  return adapter.getComments(token, taskId);
}

export async function createCommentForTask(
  userId: UserId,
  payload: PlatformCreateCommentPayload,
): Promise<PlatformComment> {
  const { adapter, token } = await createAdapterForUser(userId);
  return adapter.createComment(token, payload);
}

export async function getTransitionsForTask(
  userId: UserId,
  taskId: string,
): Promise<PlatformTransition[]> {
  const { adapter, token } = await createAdapterForUser(userId);
  return adapter.getTransitions(token, taskId);
}

export async function changeTaskStatus(
  userId: UserId,
  taskId: string,
  transitionOrStatusId: string,
): Promise<void> {
  const { adapter, token } = await createAdapterForUser(userId);
  return adapter.changeStatus(token, taskId, transitionOrStatusId);
}

export async function uploadAttachmentForUser(
  userId: UserId,
  taskId: string,
  file: { buffer: Buffer; fileName: string; mimeType: string },
): Promise<PlatformAttachment> {
  const { adapter, token } = await createAdapterForUser(userId);
  return adapter.uploadAttachment(token, taskId, file);
}

export async function getAttachmentContentForUser(
  userId: UserId,
  attachmentId: string,
): Promise<{ data: ArrayBuffer; contentType: string }> {
  const { adapter, token } = await createAdapterForUser(userId);
  return adapter.getAttachmentContent(token, attachmentId);
}

export async function deleteAttachmentForUser(userId: UserId, attachmentId: string): Promise<void> {
  const { adapter, token } = await createAdapterForUser(userId);
  return adapter.deleteAttachment(token, attachmentId);
}
