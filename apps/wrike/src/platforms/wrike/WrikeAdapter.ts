import type { PlatformToken, TaskFilters } from "@mp/task-core";
import axios, { type AxiosError, type AxiosInstance, type AxiosResponse } from "axios";
import FormData from "form-data";

import { WrikeClientError } from "@/exceptions/wrikeErrors";
import {
  formatWrikeErrorMessage,
  formatWrikeNetworkErrorMessage,
} from "@/lib/extractPlatformError";
import { isWrikeLogicalFolderId } from "@/platforms/wrike/wrikeFolderUtils";
import type { WrikeHttpAdapter } from "@/platforms/wrike/WrikeHttpAdapter";
import { toWrikeTaskQueryParams } from "@/platforms/wrike/wrikeTaskFilters";
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
  WrikeWorkflow,
} from "@/types/wrike";

/** All wrike responses wrap results in a { data: T[] } envelope. */
interface WrikeEnvelope<T> {
  data: T[];
}

const WRIKE_API_PATH = "/api/v4";

/** Optional fields allowed on GET /folders/{folderId}/tasks (not GET /tasks/{id}). */
const FOLDER_TASK_LIST_FIELDS =
  '["responsibleIds","parentIds","description","subTaskIds","superTaskIds","authorIds","hasAttachments","attachmentCount"]';

export class WrikeAdapter implements WrikeHttpAdapter {
  private readonly client: AxiosInstance;

  constructor(baseUrl: string) {
    this.client = axios.create({ baseURL: `${baseUrl}${WRIKE_API_PATH}` });

    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        // Convert all Wrike HTTP errors to WrikeClientError so platformRoute.ts
        // can map them to the correct HTTP status instead of returning 500.
        if (error.response) {
          const status = error.response.status;
          const { message, platformCode } = formatWrikeErrorMessage(error.response.data, status);
          throw new WrikeClientError(message, status, platformCode);
        }

        // No HTTP response — upstream network/timeout failure.
        throw new WrikeClientError(formatWrikeNetworkErrorMessage(error), 502, "network_error");
      },
    );
  }

  private auth(token: PlatformToken) {
    return { headers: { Authorization: `Bearer ${token.accessToken}` } };
  }

  private unwrap<T>(envelope: WrikeEnvelope<T>): T[] {
    return envelope.data;
  }

  async getTasks(
    token: PlatformToken,
    folderId: string,
    nextPageToken?: string,
    filters?: Partial<TaskFilters>,
  ): Promise<WrikeTasksPageResponse> {
    const params: Record<string, unknown> = {
      fields: FOLDER_TASK_LIST_FIELDS,
      pageSize: 50,
      ...toWrikeTaskQueryParams(filters),
    };
    if (nextPageToken) params["nextPageToken"] = nextPageToken;
    const res = await this.client.get<WrikeEnvelope<WrikeTask> & { nextPageToken?: string }>(
      `/folders/${folderId}/tasks`,
      { ...this.auth(token), params },
    );
    return { tasks: this.unwrap(res.data), nextPageToken: res.data.nextPageToken };
  }

  async getTasksByIds(token: PlatformToken, taskIds: string[]): Promise<WrikeTask[]> {
    if (taskIds.length === 0) return [];
    const res = await this.client.get<WrikeEnvelope<WrikeTask>>(
      `/tasks/${taskIds.join(",")}`,
      this.auth(token),
    );
    return this.unwrap(res.data);
  }

  async getTaskById(token: PlatformToken, taskId: string): Promise<WrikeTask> {
    // GET /tasks/{id} rejects many ?fields values that work on folder list endpoints
    // (e.g. description). The default response includes title, description, dates, etc.
    const res = await this.client.get<WrikeEnvelope<WrikeTask>>(
      `/tasks/${taskId}`,
      this.auth(token),
    );
    const task = this.unwrap(res.data)[0];
    if (!task) throw new Error(`Task not found: ${taskId}`);
    return task;
  }

  async createTask(
    token: PlatformToken,
    folderId: string,
    payload: WrikeApiCreateTaskBody,
  ): Promise<WrikeTask> {
    const res = await this.client.post<WrikeEnvelope<WrikeTask>>(
      `/folders/${folderId}/tasks`,
      payload,
      this.auth(token),
    );
    return this.unwrap(res.data)[0];
  }

  async updateTask(
    token: PlatformToken,
    taskId: string,
    payload: WrikeApiUpdateTaskBody,
  ): Promise<WrikeTask> {
    const res = await this.client.put<WrikeEnvelope<WrikeTask>>(
      `/tasks/${taskId}`,
      payload,
      this.auth(token),
    );
    return this.unwrap(res.data)[0];
  }

  async deleteTask(token: PlatformToken, taskId: string): Promise<void> {
    await this.client.delete(`/tasks/${taskId}`, this.auth(token));
  }

  async getComments(token: PlatformToken, taskId: string): Promise<WrikeComment[]> {
    const res = await this.client.get<WrikeEnvelope<WrikeComment>>(`/tasks/${taskId}/comments`, {
      ...this.auth(token),
      params: { plainText: true },
    });
    return this.unwrap(res.data);
  }

  async createComment(
    token: PlatformToken,
    payload: WrikeCreateCommentPayload,
  ): Promise<WrikeComment> {
    const res = await this.client.post<WrikeEnvelope<WrikeComment>>(
      `/tasks/${payload.taskId}/comments`,
      { text: payload.text, plainText: payload.plainText ?? true },
      this.auth(token),
    );
    return this.unwrap(res.data)[0];
  }

  async getProjects(token: PlatformToken): Promise<WrikeFolder[]> {
    const res = await this.client.get<WrikeEnvelope<WrikeFolder>>(`/folders`, {
      ...this.auth(token),
      params: { fields: '["space"]' },
    });
    return this.unwrap(res.data);
  }

  async getFolder(token: PlatformToken, folderId: string): Promise<WrikeFolder> {
    if (isWrikeLogicalFolderId(folderId)) {
      throw new Error(`Cannot query Wrike logical folder: ${folderId}`);
    }

    const auth = this.auth(token);
    // Folders do not support parentIds — only superParentIds and space are valid optional fields.
    const fieldSets = ['["superParentIds","space"]', '["space"]'];

    for (const fields of fieldSets) {
      try {
        const res = await this.client.get<WrikeEnvelope<WrikeFolder>>(`/folders/${folderId}`, {
          ...auth,
          params: { fields },
        });
        const folder = this.unwrap(res.data)[0];
        if (!folder) throw new Error(`Folder not found: ${folderId}`);
        return folder;
      } catch (error) {
        const status =
          error instanceof WrikeClientError
            ? error.statusCode
            : axios.isAxiosError(error)
              ? error.response?.status
              : undefined;
        if (status !== 400) throw error;
      }
    }

    const res = await this.client.get<WrikeEnvelope<WrikeFolder>>(`/folders/${folderId}`, auth);
    const folder = this.unwrap(res.data)[0];
    if (!folder) throw new Error(`Folder not found: ${folderId}`);
    return folder;
  }

  async getWorkflows(token: PlatformToken): Promise<WrikeWorkflow[]> {
    const res = await this.client.get<WrikeEnvelope<WrikeWorkflow>>(`/workflows`, this.auth(token));
    return this.unwrap(res.data);
  }

  async getSpaceWorkflows(token: PlatformToken, spaceId: string): Promise<WrikeWorkflow[]> {
    const res = await this.client.get<WrikeEnvelope<WrikeWorkflow>>(
      `/spaces/${spaceId}/workflows`,
      this.auth(token),
    );
    return this.unwrap(res.data);
  }

  async getSpaces(token: PlatformToken): Promise<WrikeSpace[]> {
    const res = await this.client.get<WrikeEnvelope<WrikeSpace>>(`/spaces`, this.auth(token));
    return this.unwrap(res.data);
  }

  async getContacts(token: PlatformToken): Promise<WrikeContact[]> {
    const res = await this.client.get<WrikeEnvelope<WrikeContact>>(`/contacts`, {
      ...this.auth(token),
      params: { deleted: false },
    });
    return this.unwrap(res.data);
  }

  async getCurrentContact(token: PlatformToken): Promise<WrikeContact> {
    const res = await this.client.get<WrikeEnvelope<WrikeContact>>(`/contacts`, {
      ...this.auth(token),
      params: { me: true },
    });
    const contact = this.unwrap(res.data)[0];
    if (!contact) throw new Error("Could not resolve current Wrike user.");
    return contact;
  }

  async getAttachments(token: PlatformToken, taskId: string): Promise<WrikeAttachment[]> {
    const res = await this.client.get<WrikeEnvelope<WrikeAttachment>>(
      `/tasks/${taskId}/attachments`,
      {
        ...this.auth(token),
        params: { withUrls: true },
      },
    );
    return this.unwrap(res.data);
  }

  async getAttachmentDownloadUrl(token: PlatformToken, attachmentId: string): Promise<string> {
    const res = await this.client.get<{ data: Array<{ url?: string }> }>(
      `/attachments/${attachmentId}/url`,
      this.auth(token),
    );
    const url = res.data.data?.[0]?.url;
    if (!url) throw new Error(`No download URL for attachment ${attachmentId}`);
    return url;
  }

  async addAttachment(
    token: PlatformToken,
    taskId: string,
    file: { buffer: Buffer; fileName: string; mimeType: string },
  ): Promise<void> {
    const form = new FormData();
    form.append("attachment", file.buffer, {
      filename: file.fileName,
      contentType: file.mimeType,
    });
    const { headers: authHeaders } = this.auth(token);
    await this.client.post(`/tasks/${taskId}/attachments`, form, {
      headers: {
        ...authHeaders,
        ...form.getHeaders(),
      },
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
  }

  async deleteAttachment(token: PlatformToken, attachmentId: string): Promise<void> {
    await this.client.delete(`/attachments/${attachmentId}`, this.auth(token));
  }

  async refreshToken(token: PlatformToken): Promise<PlatformToken> {
    void token;
    throw new Error("WrikeAdapter.refreshToken not implemented — use authStrategy.getValidToken()");
  }
}
