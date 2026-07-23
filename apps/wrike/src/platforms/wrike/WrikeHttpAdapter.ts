import type { PlatformToken, TaskFilters } from "@mp/task-core";

import type {
  WrikeApiCreateTaskBody,
  WrikeApiUpdateTaskBody,
  WrikeAttachment,
  WrikeComment,
  WrikeContact,
  WrikeCreateCommentPayload,
  WrikeFolder,
  WrikeSpace,
  WrikeTask,
  WrikeTasksPageResponse,
  WrikeWebhook,
  WrikeWebhookRegistrationOptions,
  WrikeWorkflow,
} from "@/types/wrike";

export interface WrikeHttpAdapter {
  getTasks(
    token: PlatformToken,
    folderId: string,
    nextPageToken?: string,
    filters?: Partial<TaskFilters>,
  ): Promise<WrikeTasksPageResponse>;
  getTaskById(token: PlatformToken, taskId: string): Promise<WrikeTask>;
  getTasksByIds(token: PlatformToken, taskIds: string[]): Promise<WrikeTask[]>;
  createTask(
    token: PlatformToken,
    folderId: string,
    payload: WrikeApiCreateTaskBody,
  ): Promise<WrikeTask>;
  updateTask(
    token: PlatformToken,
    taskId: string,
    payload: WrikeApiUpdateTaskBody,
  ): Promise<WrikeTask>;
  deleteTask(token: PlatformToken, taskId: string): Promise<void>;
  getComments(token: PlatformToken, taskId: string): Promise<WrikeComment[]>;
  createComment(token: PlatformToken, payload: WrikeCreateCommentPayload): Promise<WrikeComment>;
  getProjects(token: PlatformToken): Promise<WrikeFolder[]>;
  getFolder(token: PlatformToken, folderId: string): Promise<WrikeFolder>;
  getWorkflows(token: PlatformToken): Promise<WrikeWorkflow[]>;
  getSpaceWorkflows(token: PlatformToken, spaceId: string): Promise<WrikeWorkflow[]>;
  getSpaces(token: PlatformToken): Promise<WrikeSpace[]>;
  getContacts(token: PlatformToken): Promise<WrikeContact[]>;
  getCurrentContact(token: PlatformToken): Promise<WrikeContact>;
  getAttachments(token: PlatformToken, taskId: string): Promise<WrikeAttachment[]>;
  getAttachmentDownloadUrl(token: PlatformToken, attachmentId: string): Promise<string>;
  addAttachment(
    token: PlatformToken,
    taskId: string,
    file: { buffer: Buffer; fileName: string; mimeType: string },
  ): Promise<void>;
  deleteAttachment(token: PlatformToken, attachmentId: string): Promise<void>;
  listWebhooks(token: PlatformToken): Promise<WrikeWebhook[]>;
  createFolderWebhook(
    token: PlatformToken,
    folderId: string,
    hookUrl: string,
    options?: WrikeWebhookRegistrationOptions,
  ): Promise<WrikeWebhook>;
  refreshToken(token: PlatformToken): Promise<PlatformToken>;
}
