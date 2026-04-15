import type { InternalAxiosRequestConfig } from "axios";
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";

import type { PlatformAdapter } from "@/platforms/base/PlatformAdapter";
import { PlatformClientError } from "@/platforms/base/PlatformClientError";
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
import type {
  WrikeApiResponse,
  WrikeComment,
  WrikeContact,
  WrikeCustomStatus,
  WrikeFolder,
  WrikeTask,
  WrikeWorkflow,
} from "@/types/wrike";

const WRIKE_TOKEN_URL = "https://login.wrike.com/oauth2/token";
const WRIKE_API_PATH = "/api/v4";

const WRIKE_PRIORITIES: PlatformPriority[] = [
  { id: "High", name: "High" },
  { id: "Normal", name: "Normal" },
  { id: "Low", name: "Low" },
];

function formatWrikeError(data: unknown): string {
  if (data == null || typeof data !== "object") return "Bad request.";
  const d = data as { errorDescription?: string; error?: string };
  return d.errorDescription ?? d.error ?? "Bad request.";
}

function mapContact(c: WrikeContact): PlatformUser {
  return {
    id: c.id,
    displayName: `${c.firstName} ${c.lastName}`.trim(),
    avatarUrl: c.avatarUrl,
  };
}

function mapFolder(f: WrikeFolder): PlatformProject {
  return {
    id: f.id,
    key: f.id,
    name: f.title,
  };
}

function mapStatus(cs: WrikeCustomStatus): PlatformStatus {
  return {
    id: cs.id,
    name: cs.name,
    category: cs.group,
  };
}

function mapTransition(cs: WrikeCustomStatus): PlatformTransition {
  return {
    id: cs.id,
    name: cs.name,
    targetStatus: mapStatus(cs),
  };
}

function mapTask(
  t: WrikeTask,
  statusLookup?: Map<string, WrikeCustomStatus>,
  contactLookup?: Map<string, WrikeContact>,
): PlatformTask {
  let status: PlatformStatus | undefined;
  if (t.customStatusId && statusLookup?.has(t.customStatusId)) {
    status = mapStatus(statusLookup.get(t.customStatusId)!);
  }

  let assignee: PlatformUser | undefined;
  if (t.responsibleIds.length > 0 && contactLookup) {
    const first = contactLookup.get(t.responsibleIds[0]);
    if (first) assignee = mapContact(first);
  }

  return {
    id: t.id,
    key: t.permalink,
    summary: t.title,
    description: t.description,
    status,
    priority: { id: t.importance, name: t.importance },
    assignee,
    createdDate: t.createdDate,
    dueDate: t.dates?.due,
    parentKey: t.parentIds[0],
    platform: "wrike",
  };
}

function mapComment(c: WrikeComment, contactLookup?: Map<string, WrikeContact>): PlatformComment {
  let author: PlatformUser | undefined;
  if (contactLookup?.has(c.authorId)) {
    author = mapContact(contactLookup.get(c.authorId)!);
  }

  return {
    id: c.id,
    body: c.text,
    author,
    createdDate: c.createdDate,
    updatedDate: c.updatedDate,
  };
}

/**
 * Wrike adapter implementing PlatformAdapter against Wrike API v4.
 * The `host` parameter is the datacenter-specific API base received from the OAuth callback.
 */
export class WrikeAdapter implements PlatformAdapter {
  private readonly clientId = process.env.WRIKE_CLIENT_ID;
  private readonly clientSecret = process.env.WRIKE_CLIENT_SECRET;

  constructor(private readonly host: string) {
    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        "Wrike client credentials are not configured. Check WRIKE_CLIENT_ID and WRIKE_CLIENT_SECRET.",
      );
    }
  }

  private createAxiosClient(initialToken: PlatformToken): AxiosInstance {
    let activeToken = initialToken;

    const instance = axios.create({
      baseURL: `https://${this.host}${WRIKE_API_PATH}`,
    });

    instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      config.headers = config.headers ?? {};
      const headers = config.headers as Record<string, string>;
      headers.Authorization = `Bearer ${activeToken.accessToken}`;
      headers.Accept = "application/json";
      if (!headers["Content-Type"]) {
        headers["Content-Type"] = "application/json";
      }
      return config;
    });

    instance.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (
        error: AxiosError & {
          config?: AxiosRequestConfig & { _retry?: boolean };
        },
      ) => {
        const originalRequest = error.config;

        if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
          if (error.response && error.response.status >= 400 && error.response.status < 500) {
            throw new PlatformClientError(
              formatWrikeError(error.response.data),
              error.response.status,
              "wrike",
            );
          }
          return Promise.reject(error);
        }

        originalRequest._retry = true;
        const newToken = await this.refreshToken(activeToken);
        activeToken = newToken;

        originalRequest.headers = originalRequest.headers ?? {};
        (originalRequest.headers as Record<string, string>).Authorization =
          `Bearer ${newToken.accessToken}`;

        return instance(originalRequest);
      },
    );

    return instance;
  }

  async authenticate(authCode: string, redirectUri: string): Promise<PlatformToken> {
    const response = await axios.post(
      WRIKE_TOKEN_URL,
      new URLSearchParams({
        grant_type: "authorization_code",
        client_id: this.clientId!,
        client_secret: this.clientSecret!,
        code: authCode,
        redirect_uri: redirectUri,
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );

    const data = response.data as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
      host: string;
    };

    const expiry = new Date(Date.now() + data.expires_in * 1000).toISOString();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiry,
      tokenType: "bearer",
    };
  }

  async refreshToken(token: PlatformToken): Promise<PlatformToken> {
    const response = await axios.post(
      WRIKE_TOKEN_URL,
      new URLSearchParams({
        grant_type: "refresh_token",
        client_id: this.clientId!,
        client_secret: this.clientSecret!,
        refresh_token: token.refreshToken,
      }).toString(),
      { headers: { "Content-Type": "application/x-www-form-urlencoded" } },
    );

    const data = response.data as {
      access_token: string;
      refresh_token: string;
      expires_in: number;
      token_type: string;
    };

    const expiry = new Date(Date.now() + data.expires_in * 1000).toISOString();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiry,
      tokenType: "bearer",
    };
  }

  async getCurrentUser(token: PlatformToken): Promise<PlatformUser> {
    const client = this.createAxiosClient(token);
    const response = await client.get<WrikeApiResponse<WrikeContact>>("/contacts", {
      params: { me: true },
    });
    const contact = response.data.data[0];
    return mapContact(contact);
  }

  async getProjects(token: PlatformToken): Promise<PlatformProject[]> {
    const client = this.createAxiosClient(token);
    const response = await client.get<WrikeApiResponse<WrikeFolder>>("/folders", {
      params: { project: true },
    });
    return response.data.data.map(mapFolder);
  }

  /**
   * Wrike has no issue type concept. Returns a single synthetic "Task" entry
   * so the UI can render consistently.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getIssueTypes(_token: PlatformToken, _projectId: string): Promise<PlatformIssueType[]> {
    return [{ id: "task", name: "Task" }];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getPriorities(_token: PlatformToken, _projectId?: string): Promise<PlatformPriority[]> {
    return WRIKE_PRIORITIES;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getStatuses(token: PlatformToken, _projectId: string): Promise<PlatformStatus[]> {
    const workflows = await this.getWorkflows(token);
    return workflows.flatMap((wf) => wf.customStatuses.filter((cs) => !cs.hidden).map(mapStatus));
  }

  async searchAssignees(
    token: PlatformToken,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _params: { projectId: string; query?: string },
  ): Promise<PlatformUser[]> {
    const client = this.createAxiosClient(token);
    const response = await client.get<WrikeApiResponse<WrikeContact>>("/contacts");
    const people = response.data.data.filter((c) => c.type === "Person");
    return people.map(mapContact);
  }

  async getTasks(
    token: PlatformToken,
    projectId: string,
    cursor?: string,
    filters?: PlatformTaskFilters,
  ): Promise<PlatformTaskListResponse> {
    const client = this.createAxiosClient(token);

    const params: Record<string, string> = {
      limit: "100",
      fields: '["responsibleIds","parentIds","superTaskIds","subTaskIds","customFields"]',
    };

    if (cursor) params.pageToken = cursor;
    if (filters?.status?.length) params.customStatuses = JSON.stringify(filters.status);
    if (filters?.assignee?.length) params.responsibles = JSON.stringify(filters.assignee);
    if (filters?.priority?.length) params.importance = filters.priority.join(",");
    if (filters?.query?.trim()) params.title = filters.query.trim();

    const response = await client.get<WrikeApiResponse<WrikeTask> & { nextPageToken?: string }>(
      `/folders/${projectId}/tasks`,
      { params },
    );

    const [statusLookup, contactLookup] = await Promise.all([
      this.buildStatusLookup(token),
      this.buildContactLookup(token),
    ]);

    const tasks = response.data.data.map((t) => mapTask(t, statusLookup, contactLookup));

    return {
      tasks,
      nextCursor: response.data.nextPageToken,
      isLast: !response.data.nextPageToken,
    };
  }

  async getTaskDetails(token: PlatformToken, taskId: string): Promise<PlatformTask> {
    const client = this.createAxiosClient(token);
    const response = await client.get<WrikeApiResponse<WrikeTask>>(`/tasks/${taskId}`, {
      params: {
        fields: '["responsibleIds","parentIds","superTaskIds","subTaskIds","description"]',
      },
    });

    const task = response.data.data[0];
    const [statusLookup, contactLookup] = await Promise.all([
      this.buildStatusLookup(token),
      this.buildContactLookup(token),
    ]);

    return mapTask(task, statusLookup, contactLookup);
  }

  async createTask(
    token: PlatformToken,
    payload: PlatformCreateTaskPayload,
  ): Promise<PlatformTask> {
    const client = this.createAxiosClient(token);

    const body: Record<string, unknown> = {
      title: payload.summary,
    };
    if (payload.description) body.description = payload.description;
    if (payload.priority) body.importance = payload.priority;
    if (payload.assignee) body.responsibles = [payload.assignee];
    if (payload.dueDate) body.dates = { due: payload.dueDate, type: "Planned" };
    if (payload.parentTaskKey) body.superTasks = [payload.parentTaskKey];

    const response = await client.post<WrikeApiResponse<WrikeTask>>(
      `/folders/${payload.projectId}/tasks`,
      body,
    );

    const task = response.data.data[0];
    return mapTask(task);
  }

  async updateTask(
    token: PlatformToken,
    taskId: string,
    payload: PlatformUpdateTaskPayload,
  ): Promise<PlatformTask> {
    const client = this.createAxiosClient(token);

    const body: Record<string, unknown> = {};
    if (payload.summary !== undefined) body.title = payload.summary;
    if (payload.description !== undefined) body.description = payload.description;
    if (payload.priority !== undefined) body.importance = payload.priority ?? "Normal";
    if (payload.dueDate !== undefined) {
      body.dates = payload.dueDate
        ? { due: payload.dueDate, type: "Planned" }
        : { type: "Backlog" };
    }
    if (payload.statusId) body.customStatus = payload.statusId;

    if (payload.assignee !== undefined) {
      if (payload.assignee) {
        body.addResponsibles = [payload.assignee];
      } else {
        const existing = await this.getTaskDetails(token, taskId);
        if (existing.assignee) {
          body.removeResponsibles = [existing.assignee.id];
        }
      }
    }

    const response = await client.put<WrikeApiResponse<WrikeTask>>(`/tasks/${taskId}`, body);
    const task = response.data.data[0];

    const [statusLookup, contactLookup] = await Promise.all([
      this.buildStatusLookup(token),
      this.buildContactLookup(token),
    ]);

    return mapTask(task, statusLookup, contactLookup);
  }

  async deleteTask(token: PlatformToken, taskId: string): Promise<void> {
    const client = this.createAxiosClient(token);
    await client.delete(`/tasks/${taskId}`);
  }

  async getComments(token: PlatformToken, taskId: string): Promise<PlatformCommentsResponse> {
    const client = this.createAxiosClient(token);
    const response = await client.get<WrikeApiResponse<WrikeComment>>(`/tasks/${taskId}/comments`);

    const contactLookup = await this.buildContactLookup(token);
    const comments = response.data.data.map((c) => mapComment(c, contactLookup));

    return { comments, total: comments.length };
  }

  async createComment(
    token: PlatformToken,
    payload: PlatformCreateCommentPayload,
  ): Promise<PlatformComment> {
    const client = this.createAxiosClient(token);

    let text = payload.text;
    if (payload.replyToAuthorName) {
      text = `@${payload.replyToAuthorName} ${text}`;
    }

    const response = await client.post<WrikeApiResponse<WrikeComment>>(
      `/tasks/${payload.taskId}/comments`,
      { text },
    );

    const comment = response.data.data[0];
    const contactLookup = await this.buildContactLookup(token);
    return mapComment(comment, contactLookup);
  }

  /**
   * Wrike has no transition API. Available statuses from the project's workflow
   * are returned as "transitions" so the UI can render a status-change picker.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async getTransitions(token: PlatformToken, _taskId: string): Promise<PlatformTransition[]> {
    const workflows = await this.getWorkflows(token);
    return workflows.flatMap((wf) =>
      wf.customStatuses.filter((cs) => !cs.hidden).map(mapTransition),
    );
  }

  /**
   * Wrike status changes are done via PUT /tasks/{id} with customStatus.
   */
  async changeStatus(token: PlatformToken, taskId: string, statusId: string): Promise<void> {
    const client = this.createAxiosClient(token);
    await client.put(`/tasks/${taskId}`, { customStatus: statusId });
  }

  async uploadAttachment(
    token: PlatformToken,
    taskId: string,
    file: { buffer: Buffer; fileName: string; mimeType: string },
  ): Promise<PlatformAttachment> {
    const client = this.createAxiosClient(token);
    const FormDataNode = (await import("form-data")).default;
    const form = new FormDataNode();
    form.append("file", file.buffer, {
      filename: file.fileName,
      contentType: file.mimeType,
    });
    const response = await client.post<WrikeApiResponse<{ id: string; name: string }>>(
      `/tasks/${taskId}/attachments`,
      form,
      {
        headers: form.getHeaders(),
        timeout: 90_000,
        maxContentLength: Infinity,
        maxBodyLength: Infinity,
      },
    );
    const att = response.data.data[0];
    return { id: att.id, filename: att.name };
  }

  async getAttachmentContent(
    token: PlatformToken,
    attachmentId: string,
  ): Promise<{ data: ArrayBuffer; contentType: string }> {
    const client = this.createAxiosClient(token);
    const response = await client.get(`/attachments/${attachmentId}/download`, {
      responseType: "arraybuffer",
    });

    return {
      data: response.data as ArrayBuffer,
      contentType: (response.headers["content-type"] as string) ?? "application/octet-stream",
    };
  }

  async deleteAttachment(token: PlatformToken, attachmentId: string): Promise<void> {
    const client = this.createAxiosClient(token);
    await client.delete(`/attachments/${attachmentId}`);
  }

  // ── Internal helpers ──────────────────────────────────────────────

  private async getWorkflows(token: PlatformToken): Promise<WrikeWorkflow[]> {
    const client = this.createAxiosClient(token);
    const response = await client.get<WrikeApiResponse<WrikeWorkflow>>("/workflows");
    return response.data.data;
  }

  private async buildStatusLookup(token: PlatformToken): Promise<Map<string, WrikeCustomStatus>> {
    const workflows = await this.getWorkflows(token);
    const map = new Map<string, WrikeCustomStatus>();
    for (const wf of workflows) {
      for (const cs of wf.customStatuses) {
        map.set(cs.id, cs);
      }
    }
    return map;
  }

  private async buildContactLookup(token: PlatformToken): Promise<Map<string, WrikeContact>> {
    const client = this.createAxiosClient(token);
    const response = await client.get<WrikeApiResponse<WrikeContact>>("/contacts");
    const map = new Map<string, WrikeContact>();
    for (const c of response.data.data) {
      map.set(c.id, c);
    }
    return map;
  }
}
