import type { PlatformToken } from "@mp/task-core";
import axios, { type AxiosInstance } from "axios";

import type { WrikeHttpAdapter } from "@/platforms/wrike/WrikeHttpAdapter";
import type {
  WrikeComment,
  WrikeCreateCommentPayload,
  WrikeCreateTaskPayload,
  WrikeFolder,
  WrikeTask,
  WrikeTasksPageResponse,
  WrikeUpdateTaskPayload,
} from "@/types/wrike";

/** All wrike responses wrap results in a { data: T[] } envelope. */
interface WrikeEnvelope<T> {
  data: T[];
}

// Extracted from capabilities/wrike.api.yaml → baseUrl.
// The wrikeService.ts normalises platformSite to the host; this segment is appended.
const WRIKE_API_PATH = "/api/v4";

/**
 * Wrike raw HTTP adapter.
 *
 * Owns all API communication: request construction, auth headers, response
 * unwrapping. Returns platform-native shapes from src/types/wrike.ts —
 * never @mp/task-core types. Consumed by WrikeServiceAdapter.
 *
 * Generated from capabilities/wrike.api.yaml.
 * Review src/types/wrike.ts and fill in query param details before shipping.
 */
export class WrikeAdapter implements WrikeHttpAdapter {
  private readonly client: AxiosInstance;

  constructor(baseUrl: string) {
    this.client = axios.create({ baseURL: `${baseUrl}${WRIKE_API_PATH}` });
  }

  private auth(token: PlatformToken) {
    return { headers: { Authorization: `Bearer ${token.accessToken}` } };
  }

  private unwrap<T>(envelope: WrikeEnvelope<T>): T[] {
    return envelope.data;
  }

  // ── Tasks ───────────────────────────────────────────────────────────────────

  async getTasks(
    token: PlatformToken,
    folderId: string,
    nextPageToken?: string,
  ): Promise<WrikeTasksPageResponse> {
    const params: Record<string, unknown> = {
      fields:
        '["responsibleIds","parentIds","description","subTaskIds","superTaskIds","authorIds","hasAttachments","attachmentCount"]',
      pageSize: 50,
    };
    if (nextPageToken) params["nextPageToken"] = nextPageToken;
    const res = await this.client.get<WrikeEnvelope<WrikeTask> & { nextPageToken?: string }>(
      `/folders/${folderId}/tasks`,
      { ...this.auth(token), params },
    );
    return { tasks: this.unwrap(res.data), nextPageToken: res.data.nextPageToken };
  }
  async getTaskById(token: PlatformToken, taskId: string): Promise<WrikeTask> {
    const res = await this.client.get<WrikeEnvelope<WrikeTask>>(
      `/tasks/${taskId}`,
      this.auth(token),
    );
    return this.unwrap(res.data)[0];
  }
  async createTask(
    token: PlatformToken,
    folderId: string,
    payload: WrikeCreateTaskPayload,
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
    payload: WrikeUpdateTaskPayload,
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

  // ── Comments ────────────────────────────────────────────────────────────────

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
      "/comments",
      payload,
      this.auth(token),
    );
    return this.unwrap(res.data)[0];
  }

  // ── Projects ────────────────────────────────────────────────────────────────

  async getProjects(token: PlatformToken): Promise<WrikeFolder[]> {
    const res = await this.client.get<WrikeEnvelope<WrikeFolder>>(`/folders`, {
      ...this.auth(token),
      params: { fields: '["description"]' },
    });
    return this.unwrap(res.data);
  }

  // ── Statuses ────────────────────────────────────────────────────────────────

  async getStatuses(token: PlatformToken): Promise<unknown[]> {
    const res = await this.client.get<WrikeEnvelope<unknown>>(`/workflows`, this.auth(token));
    return this.unwrap(res.data);
  }

  // ── Assignees ───────────────────────────────────────────────────────────────

  async getAssignees(token: PlatformToken): Promise<unknown[]> {
    const res = await this.client.get<WrikeEnvelope<unknown>>(`/contacts`, {
      ...this.auth(token),
      params: { deleted: false },
    });
    return this.unwrap(res.data);
  }

  // ── Transitions ─────────────────────────────────────────────────────────────

  async getTransitions(token: PlatformToken): Promise<unknown[]> {
    const res = await this.client.get<WrikeEnvelope<unknown>>(`/workflows`, this.auth(token));
    return this.unwrap(res.data);
  }

  // ── Attachments ─────────────────────────────────────────────────────────────

  async getAttachments(token: PlatformToken, taskId: string): Promise<unknown[]> {
    const res = await this.client.get<WrikeEnvelope<unknown>>(`/tasks/${taskId}/attachments`, {
      ...this.auth(token),
      params: { withUrls: true },
    });
    return this.unwrap(res.data);
  }

  // ── Auth ─────────────────────────────────────────────────────────────────

  async refreshToken(token: PlatformToken): Promise<PlatformToken> {
    // TODO: exchange token.refreshToken via the platform's token endpoint
    void token;
    throw new Error("WrikeAdapter.refreshToken not implemented");
  }
}
