import type { PlatformToken } from "@mp/task-core";

import type {
  WrikeComment,
  WrikeCreateCommentPayload,
  WrikeCreateTaskPayload,
  WrikeFolder,
  WrikeTask,
  WrikeTasksPageResponse,
  WrikeUpdateTaskPayload,
} from "@/types/wrike";

/**
 * Wrike HTTP API contract — generated from capabilities/wrike.api.yaml.
 * Keep in sync with WrikeAdapter.ts.
 * Replace any remaining stub types in src/types/wrike.ts before shipping.
 */
export interface WrikeHttpAdapter {
  getTasks(
    token: PlatformToken,
    folderId: string,
    nextPageToken?: string,
  ): Promise<WrikeTasksPageResponse>;
  getTaskById(token: PlatformToken, taskId: string): Promise<WrikeTask>;
  createTask(
    token: PlatformToken,
    folderId: string,
    payload: WrikeCreateTaskPayload,
  ): Promise<WrikeTask>;
  updateTask(
    token: PlatformToken,
    taskId: string,
    payload: WrikeUpdateTaskPayload,
  ): Promise<WrikeTask>;
  deleteTask(token: PlatformToken, taskId: string): Promise<void>;
  getComments(token: PlatformToken, taskId: string): Promise<WrikeComment[]>;
  createComment(token: PlatformToken, payload: WrikeCreateCommentPayload): Promise<WrikeComment>;
  getProjects(token: PlatformToken): Promise<WrikeFolder[]>;
  getStatuses(token: PlatformToken): Promise<unknown[]>;
  getAssignees(token: PlatformToken): Promise<unknown[]>;
  getTransitions(token: PlatformToken): Promise<unknown[]>;
  getAttachments(token: PlatformToken, taskId: string): Promise<unknown[]>;
  refreshToken(token: PlatformToken): Promise<PlatformToken>;
}
