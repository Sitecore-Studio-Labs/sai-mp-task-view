import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import type { PlatformAdapter } from "@/platforms/base/PlatformAdapter";
import type {
  JiraProject,
  JiraIssue,
  JiraIssueType,
  JiraTask,
  CreateJiraTaskPayload,
  JiraPriority,
  JiraUser,
  JiraIssueOption,
  JiraIssueFilters,
  GetCommentsForIssueResponse,
  JiraComment,
  CreateCommentPayload,
} from "@/types/jira";
import type { PlatformToken } from "@/types/platform";
import type { InternalAxiosRequestConfig } from "axios";
import { buildProjectIssuesJql } from "@/lib/jqlBuilder";
import FormData from "form-data";
import { convertHtmlToADF } from "@razroo/html-to-adf";

/** Thrown when Jira API returns 4xx (e.g. validation error). Message is parsed from Jira response. */
export class JiraClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
  ) {
    super(message);
    this.name = "JiraClientError";
  }
}

function formatJiraErrorResponse(data: unknown): string {
  if (data == null || typeof data !== "object") return "Bad request.";
  const d = data as { errorMessages?: string[]; errors?: Record<string, string> };
  const messages: string[] = [...(d.errorMessages ?? [])];
  if (d.errors && typeof d.errors === "object") {
    for (const [field, msg] of Object.entries(d.errors)) {
      messages.push(`${field}: ${msg}`);
    }
  }
  return messages.length > 0 ? messages.join(" ") : "Bad request.";
}

/**
 * Jira adapter for the initial setup: OAuth and project listing only.
 * Uses axios with interceptors to attach the token, detect 401, refresh, and retry.
 */
export class JiraAdapter implements PlatformAdapter {
  private readonly clientId = process.env.JIRA_CLIENT_ID;
  private readonly clientSecret = process.env.JIRA_CLIENT_SECRET;

  constructor(private readonly jiraBaseUrl: string) {
    if (!this.clientId || !this.clientSecret) {
      throw new Error(
        "Jira client credentials are not configured. Check JIRA_CLIENT_ID and JIRA_CLIENT_SECRET.",
      );
    }
  }

  private createAxiosClient(initialToken: PlatformToken): AxiosInstance {
    let activeToken = initialToken;

    const instance = axios.create({
      baseURL: this.jiraBaseUrl,
    });

    instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      config.headers = config.headers ?? {};
      const headers = config.headers as Record<string, string>;
      headers.Authorization = `Bearer ${activeToken.accessToken}`;
      headers.Accept = "application/json";
      const hasMultipart =
        config.data &&
        typeof (config.data as { getHeaders?: () => unknown }).getHeaders === "function";
      if (!hasMultipart) {
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

        if (
          !originalRequest ||
          error.response?.status !== 401 ||
          originalRequest._retry
        ) {
          return Promise.reject(error);
        }

        originalRequest._retry = true;
        const newToken = await this.refreshToken(activeToken);
        activeToken = newToken;

        originalRequest.headers = originalRequest.headers ?? {};
        (originalRequest.headers as Record<string, string>).Authorization = `Bearer ${newToken.accessToken}`;

        return instance(originalRequest);
      },
    );

    return instance;
  }

  async authenticate(
    authCode: string,
    redirectUri: string,
  ): Promise<PlatformToken> {
    const tokenResponse = await axios.post(
      "https://auth.atlassian.com/oauth/token",
      {
        grant_type: "authorization_code",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: authCode,
        redirect_uri: redirectUri,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
    );

    const data = tokenResponse.data as {
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

  async refreshToken(token: PlatformToken): Promise<PlatformToken> {
    const response = await axios.post(
      "https://auth.atlassian.com/oauth/token",
      {
        grant_type: "refresh_token",
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: token.refreshToken,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      },
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

  async getProjects(token: PlatformToken): Promise<JiraProject[]> {
    const client = this.createAxiosClient(token);
    const response = await client.get<{
      values: Array<{ id: string; key: string; name: string }>;
    }>("/rest/api/3/project/search");

    return response.data.values.map(
      (project: { id: string; key: string; name: string }) => ({
        id: project.id,
        key: project.key,
        name: project.name,
      }),
    );
  }

  async getMyself(token: PlatformToken): Promise<JiraUser> {
    const client = this.createAxiosClient(token);
    const response = await client.get<{
      accountId: string;
      displayName: string;
      avatarUrls?: Record<string, string>;
    }>("/rest/api/3/myself");
    const u = response.data;
    return {
      accountId: u.accountId,
      displayName: u.displayName,
      avatarUrls: u.avatarUrls,
    };
  }

  async getProjectIssues(
    token: PlatformToken,
    projectKey: string,
    cursor?: string,
    filters?: JiraIssueFilters,
  ): Promise<{
    issues: JiraIssue[];
    nextPageToken?: string;
    isLast: boolean;
  }> {
    const client = this.createAxiosClient(token);
    const jql = buildProjectIssuesJql(projectKey, filters);

    const response = await client.get("/rest/api/3/search/jql", {
      params: {
        jql: jql,
        fields: [
          'summary',
          'status',
          'assignee',
          'priority',
          'issuetype',
          'created',
          'parent',
        ].join(','),
        maxResults: 50,
        nextPageToken: cursor,
      },
    });

    return {
      issues: response.data.issues,
      nextPageToken: response.data.nextPageToken,
      isLast: response.data.isLast,
    };
  }

  async getIssueTypes(
    token: PlatformToken,
    projectId: string,
  ): Promise<JiraIssueType[]> {
    const client = this.createAxiosClient(token);

    const response = await client.get<
      Array<{ id: string; name: string; description?: string; iconUrl?: string }>
    >("/rest/api/3/issuetype/project", {
      params: { projectId },
    });

    const list = Array.isArray(response.data) ? response.data : [];
    return list.map(
      (it: { id: string; name: string; description?: string; iconUrl?: string }) => ({
        id: it.id,
        name: it.name,
        description: it.description,
        iconUrl: it.iconUrl,
      }),
    );
  }

  async getPriorities(token: PlatformToken): Promise<JiraPriority[]> {
    const client = this.createAxiosClient(token);
    const response = await client.get<
      Array<{
        id: string;
        name: string;
        description?: string;
        iconUrl?: string;
      }>
    >("/rest/api/3/priority");
    const list = Array.isArray(response.data) ? response.data : [];
    return list.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      iconUrl: p.iconUrl,
    }));
  }

  async searchAssignees(
    token: PlatformToken,
    params: { projectIdOrKey: string; query?: string },
  ): Promise<JiraUser[]> {
    const client = this.createAxiosClient(token);
    const response = await client.get<
      Array<{
        accountId: string;
        displayName: string;
        avatarUrls?: Record<string, string>;
      }>
    >("/rest/api/3/user/assignable/search", {
      params: {
        project: params.projectIdOrKey,
        query: params.query,
        maxResults: 20,
      },
    });
    const list = Array.isArray(response.data) ? response.data : [];
    return list.map((u) => ({
      accountId: u.accountId,
      displayName: u.displayName,
      avatarUrls: u.avatarUrls,
    }));
  }

  async createTask(
    token: PlatformToken,
    payload: CreateJiraTaskPayload,
  ): Promise<JiraTask> {
    const client = this.createAxiosClient(token);

    const dueDate =
      payload.dueDate == null || payload.dueDate === ""
        ? undefined
        : /^\d{4}-\d{2}-\d{2}/.test(payload.dueDate)
          ? payload.dueDate.slice(0, 10)
          : (() => {
              const d = new Date(payload.dueDate);
              if (Number.isNaN(d.getTime()))
                throw new Error(
                  "Invalid dueDate. Expected an ISO date/datetime string.",
                );
              return d.toISOString().slice(0, 10);
            })();

    const priority =
      payload.priority == null || payload.priority === ""
        ? undefined
        : /^\d+$/.test(payload.priority)
          ? { id: payload.priority }
          : { name: payload.priority };

    const descriptionTrimmed =
      payload.description != null ? payload.description.trim() : "";
    const isHtml = descriptionTrimmed.startsWith("<");

    const descriptionADF =
      descriptionTrimmed !== ""
        ? isHtml
          ? convertHtmlToADF(descriptionTrimmed)
          : {
              type: "doc",
              version: 1,
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: descriptionTrimmed }],
                },
              ],
            }
        : undefined;

    const body = {
      fields: {
        project: { id: payload.projectId },
        issuetype: { id: payload.issueTypeId },
        summary: payload.summary,
        ...(descriptionADF && { description: descriptionADF }),
        ...(priority && { priority }),
        ...(payload.assignee != null &&
          payload.assignee !== "" && {
            assignee: { accountId: payload.assignee },
          }),
        ...(dueDate && { duedate: dueDate }),
        ...(payload.parentIssueKey != null &&
          payload.parentIssueKey !== "" && {
            parent: { key: payload.parentIssueKey.trim() },
          }),
      },
    };
    let response: { data: { id: string; key: string; self: string } };
    try {
      response = await client.post<{
        id: string;
        key: string;
        self: string;
      }>("/rest/api/3/issue", body);
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response) {
        const status = err.response.status;
        const message = formatJiraErrorResponse(err.response.data);
        throw new JiraClientError(message, status);
      }
      throw err;
    }
    const { id, key, self } = response.data;
    const issueResponse = await client.get<{
      fields: {
        summary: string;
        description?:
          | { content?: Array<{ content?: Array<{ text?: string }> }> }
          | string;
        project: { id: string; key: string };
        issuetype: { id: string; name: string };
        priority?: { id: string; name: string };
        assignee?: { accountId: string; displayName: string };
        duedate?: string;
      };
    }>(`/rest/api/3/issue/${id}`, {
      params: {
        fields:
          "summary,description,project,issuetype,priority,assignee,duedate",
      },
    });
    const f = issueResponse.data.fields;
    const description =
      typeof f.description === "string"
        ? f.description
        : f.description?.content
            ?.map((c) => c.content?.map((t) => t.text ?? "").join(""))
            .join("\n");
    return {
      id,
      key,
      self,
      summary: f.summary,
      description,
      projectId: f.project.id,
      projectKey: f.project.key,
      issueTypeId: f.issuetype.id,
      issueTypeName: f.issuetype.name,
      priorityId: f.priority?.id,
      priorityName: f.priority?.name,
      assigneeAccountId: f.assignee?.accountId,
      assigneeDisplayName: f.assignee?.displayName,
      dueDate: f.duedate,
    };
  }

  /**
   * Add an attachment to an issue. Jira expects multipart/form-data with field "file"
   * and header X-Atlassian-Token: no-check.
   */
  async addAttachment(
    token: PlatformToken,
    issueIdOrKey: string,
    file: { buffer: Buffer; fileName: string; mimeType: string },
  ): Promise<void> {
    const client = this.createAxiosClient(token);
    const form = new FormData();
    form.append("file", file.buffer, {
      filename: file.fileName,
      contentType: file.mimeType,
    });
    await client.post(`/rest/api/3/issue/${issueIdOrKey}/attachments`, form, {
      headers: {
        "X-Atlassian-Token": "no-check",
        ...form.getHeaders(),
      },
      timeout: 90_000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
  }

  async getIssueDetails(
    token: PlatformToken,
    issueIdOrKey: string,
  ): Promise<JiraIssue[]> {
    const client = this.createAxiosClient(token);

    const response = await client.get(`/rest/api/3/issue/${issueIdOrKey}`, {
      headers: {
        Accept: "application/json",
      },
    });

    return response.data;
  }

  async getProjectIssueStatuses(
    token: PlatformToken,
    projectKey: string,
  ): Promise<Array<{ id: string; name: string }>> {
    const client = this.createAxiosClient(token);

    const response = await client.get(
      `/rest/api/3/project/${projectKey}/statuses`,
    );

    return response.data;
  }

  async deleteIssue(
    token: PlatformToken,
    issueIdOrKey: string,
  ): Promise<number> {
    const client = this.createAxiosClient(token);
    const response = await client.delete(`/rest/api/3/issue/${issueIdOrKey}`);
    return response.status;
  }

  async getDeleteIssuePermission(
    token: PlatformToken,
    issueIdOrKey: string,
  ): Promise<boolean> {
    const client = this.createAxiosClient(token);

    const response = await client.get('/rest/api/3/mypermissions', {
      params: {
        permissions: 'DELETE_ISSUES',
        issueKey: issueIdOrKey,
      },
    });

    return response.data?.permissions?.DELETE_ISSUES?.havePermission ?? false;
  }

  async getIssueComments(
    token: PlatformToken,
    issueIdOrKey: string,
  ): Promise<GetCommentsForIssueResponse> {
    const client = this.createAxiosClient(token);

    const response = await client.get(
      `/rest/api/3/issue/${issueIdOrKey}/comment`,
    );

    return response.data;
  }

  async getCommentDetails(
    token: PlatformToken,
    issueIdOrKey: string,
    commentId: string,
  ): Promise<JiraComment> {
    const client = this.createAxiosClient(token);

    const response = await client.get(
      `/rest/api/3/issue/${issueIdOrKey}/comment/${commentId}`,
    );

    return response.data;
  }

  async createComment(token: PlatformToken, payload: CreateCommentPayload) {

    if (!payload.issueIdOrKey || payload.issueIdOrKey.trim() === "") {
      throw new Error("issueIdOrKey is required");
    }

    const client = this.createAxiosClient(token);

    const content = [];

    // If payload has mention info, it creates a comment that mentions the user 
    // otherwise, it creates a simple comment.
    if (payload.replyToAuthorAccountId && payload.replyToAuthorDisplayName) {
      content.push({
        type: "paragraph",
        content: [
          {
            type: "mention",
            attrs: {
              id: payload.replyToAuthorAccountId,
              text: `@${payload.replyToAuthorDisplayName}`,
              accessLevel: "",
            },
          },
          {
            type: "text",
            text: ` ${payload.text}`,
          },
        ],
      });
    } else {
      content.push({
        type: "paragraph",
        content: [
          {
            type: "text",
            text: payload.text,
          },
        ],
      });
    }

    const body = {
      body: {
        type: "doc",
        version: 1,
        content,
      },
      ...(payload.visibility && { visibility: payload.visibility }),
    };

    const response = await client.post(
      `/rest/api/3/issue/${payload.issueIdOrKey}/comment`,
      body,
    );

    return response.data;
  }

  /**
   * Register dynamic webhooks with Jira (OAuth 2.0 / Connect app).
   * POST /rest/api/3/webhook
   * @see https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-webhooks/#api-rest-api-3-webhook-post
   */
  async registerWebhooks(
    token: PlatformToken,
    callbackUrl: string,
    webhooks: Array<{
      events: string[];
      jqlFilter?: string;
    }>,
  ): Promise<Array<{ createdWebhookId?: number; errors?: string[] }>> {
    const client = this.createAxiosClient(token);
    // Jira returns "Empty JQL search not supported" when jqlFilter is omitted. Dynamic webhooks
    // only support: project, issuetype, issueKey, status, assignee, reporter, priority, issue.property, cf[id].
    // Use a permissive clause that matches all issues (no project has key "NONE").
    const defaultJql = "project != \"NONE\"";
    const response = await client.post<{
      webhookRegistrationResult: Array<
        { createdWebhookId: number } | { errors: string[] }
      >;
    }>("/rest/api/3/webhook", {
      url: callbackUrl,
      webhooks: webhooks.map((w) => ({
        events: w.events,
        jqlFilter:
          w.jqlFilter?.trim() ? w.jqlFilter.trim() : defaultJql,
      })),
    });
    const results = response.data.webhookRegistrationResult ?? [];
    return results.map((r) =>
      "createdWebhookId" in r
        ? { createdWebhookId: r.createdWebhookId }
        : { errors: r.errors },
    );
  }

  async getAttachmentContent(
    token: PlatformToken,
    attachmentId: string,
  ): Promise<{ data: ArrayBuffer; contentType: string }> {
    const client = this.createAxiosClient(token);

    const response = await client.get(
      `/rest/api/3/attachment/content/${attachmentId}`,
      {
        responseType: 'arraybuffer',
        headers: {
          Accept: '*/*',
        },
      },
    );

    return {
      data: response.data,
      contentType:
        response.headers['content-type'] || 'application/octet-stream',
    };
  }
}
