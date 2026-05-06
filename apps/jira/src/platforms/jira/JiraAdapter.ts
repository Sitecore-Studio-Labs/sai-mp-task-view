import type { PlatformToken } from "@mp/task-core";
import { convertHtmlToADF } from "@razroo/html-to-adf";
import type { InternalAxiosRequestConfig } from "axios";
import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse } from "axios";
import FormData from "form-data";

import { buildProjectIssuesJql } from "@/lib/jqlBuilder";
import type { JiraHttpAdapter } from "@/platforms/jira/JiraHttpAdapter";
import type {
  CreateCommentPayload,
  CreateJiraTaskPayload,
  GetCommentsForIssueResponse,
  JiraComment,
  JiraField,
  JiraIssue,
  JiraIssueFilters,
  JiraIssueType,
  JiraPriority,
  JiraProject,
  JiraProjectIssuesResponse,
  JiraTask,
  JiraUser,
  ProjectIssueType,
  UpdateJiraTaskPayload,
} from "@/types/jira";

const JIRA_API_BASE = "/rest/api/3";

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
  const d = data as {
    errorMessages?: string[];
    errors?: Record<string, string>;
  };
  const messages: string[] = [...(d.errorMessages ?? [])];
  if (d.errors && typeof d.errors === "object") {
    for (const [field, msg] of Object.entries(d.errors)) {
      messages.push(`${field}: ${msg}`);
    }
  }
  return messages.length > 0 ? messages.join(" ") : "Bad request.";
}

function isSubtaskIssueType(it: {
  name?: string;
  subtask?: boolean;
  hierarchyLevel?: number;
}): boolean {
  if (it.subtask === true) return true;
  if (typeof it.hierarchyLevel === "number" && it.hierarchyLevel < 0) return true;
  const n = (it.name ?? "").toLowerCase();
  return n.includes("subtask") || n === "sub-task";
}

/**
 * Jira adapter for the initial setup: OAuth and project listing only.
 * Uses axios with interceptors to attach the token, detect 401, refresh, and retry.
 */
export class JiraAdapter implements JiraHttpAdapter {
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

        if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
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
    if (!token.refreshToken) {
      throw new Error("refreshToken: no refresh token available.");
    }
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
    }>(`${JIRA_API_BASE}/project/search`);

    return response.data.values.map((project: { id: string; key: string; name: string }) => ({
      id: project.id,
      key: project.key,
      name: project.name,
    }));
  }

  async getMyself(token: PlatformToken): Promise<JiraUser> {
    const client = this.createAxiosClient(token);
    const response = await client.get<{
      accountId: string;
      displayName: string;
      avatarUrls?: Record<string, string>;
    }>(`${JIRA_API_BASE}/myself`);
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
  ): Promise<JiraProjectIssuesResponse> {
    const client = this.createAxiosClient(token);
    const jql = buildProjectIssuesJql(projectKey, filters);

    const response = await client.get(`${JIRA_API_BASE}/search/jql`, {
      params: {
        jql: jql,
        fields: [
          "summary",
          "status",
          "assignee",
          "priority",
          "issuetype",
          "created",
          "parent",
          "project",
        ].join(","),
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

  async updateTask(
    token: PlatformToken,
    issueIdOrKey: string,
    payload: UpdateJiraTaskPayload,
  ): Promise<JiraIssue> {
    const client = this.createAxiosClient(token);

    const fields: Record<string, unknown> = {};
    const parentIssueKey = (payload.parentIssueKey ?? "").trim();
    let parentProjectKey: string | undefined;
    let resolvedIssueTypeId =
      payload.issueType !== undefined && payload.issueType != null && payload.issueType !== ""
        ? payload.issueType.trim()
        : undefined;

    if (parentIssueKey) {
      fields.parent = { key: parentIssueKey };
      try {
        // When setting parent, Jira validates issue type against the parent's project.
        // Resolve from parent directly so stale UI state cannot send a type from another project.
        const parentIssueRes = await client.get<{
          fields: { project: { id: string; key: string } };
        }>(`${JIRA_API_BASE}/issue/${parentIssueKey}`, {
          params: { fields: "project" },
        });
        const parentProjectId = parentIssueRes.data.fields?.project?.id;
        parentProjectKey = parentIssueRes.data.fields?.project?.key;
        if (parentProjectId) {
          fields.project = { id: parentProjectId };

          const typeRes = await client.get<
            Array<{
              id: string;
              name: string;
              description?: string;
              iconUrl?: string;
              subtask?: boolean;
              hierarchyLevel?: number;
            }>
          >(`${JIRA_API_BASE}/issuetype/project`, {
            params: { projectId: parentProjectId },
          });
          const parentProjectTypes = Array.isArray(typeRes.data) ? typeRes.data : [];
          const matchingProvidedType = resolvedIssueTypeId
            ? parentProjectTypes.find((it) => it.id === resolvedIssueTypeId)
            : undefined;
          if (!matchingProvidedType || !isSubtaskIssueType(matchingProvidedType)) {
            const subtaskType = parentProjectTypes.find(isSubtaskIssueType);
            if (!subtaskType) {
              throw new JiraClientError(
                "Sub-task issue type is not available for the parent issue project.",
                400,
              );
            }
            resolvedIssueTypeId = subtaskType.id;
          }
        }
      } catch (err) {
        if (
          axios.isAxiosError(err) &&
          err.response &&
          err.response.status >= 400 &&
          err.response.status < 500
        ) {
          const message = formatJiraErrorResponse(err.response.data);
          throw new JiraClientError(message, err.response.status);
        }
        throw err;
      }
    }

    if (payload.summary !== undefined) fields.summary = payload.summary;
    if (payload.description !== undefined) {
      const d = payload.description;
      if (d === "" || d == null) {
        fields.description = null;
      } else {
        const trimmed = String(d).trim();
        // Prefer HTML -> ADF conversion when the editor provides HTML.
        // Fall back to plain-text paragraph if conversion fails.
        if (/[<>]/.test(trimmed)) {
          try {
            fields.description = convertHtmlToADF(trimmed);
          } catch {
            fields.description = {
              type: "doc",
              version: 1,
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: trimmed }],
                },
              ],
            };
          }
        } else {
          fields.description = {
            type: "doc",
            version: 1,
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: trimmed }],
              },
            ],
          };
        }
      }
    }
    if (resolvedIssueTypeId) {
      fields.issuetype = { id: resolvedIssueTypeId };
    }
    if (payload.priority !== undefined) {
      fields.priority =
        payload.priority === null || payload.priority === ""
          ? null
          : /^\d+$/.test(payload.priority)
            ? { id: payload.priority }
            : { name: payload.priority };
    }
    if (payload.assignee !== undefined) {
      fields.assignee =
        payload.assignee === null || payload.assignee === ""
          ? null
          : { accountId: payload.assignee };
    }
    if (payload.dueDate !== undefined) {
      const v = payload.dueDate;
      if (v === null || v === "") {
        fields.duedate = null;
      } else {
        fields.duedate = /^\d{4}-\d{2}-\d{2}/.test(v)
          ? v.slice(0, 10)
          : new Date(v).toISOString().slice(0, 10);
      }
    }

    if (Object.keys(fields).length === 0) {
      // No updates; fetch and return current issue
      const getRes = await client.get<{
        id: string;
        key: string;
        fields: JiraIssue["fields"];
      }>(`${JIRA_API_BASE}/issue/${issueIdOrKey}`, {
        params: {
          fields: "summary,status,issuetype,priority,assignee",
        },
      });
      return {
        id: getRes.data.id,
        key: getRes.data.key,
        fields: getRes.data.fields,
      };
    }

    try {
      await client.put(`${JIRA_API_BASE}/issue/${issueIdOrKey}`, { fields });
    } catch (err) {
      if (
        axios.isAxiosError(err) &&
        err.response &&
        err.response.status >= 400 &&
        err.response.status < 500
      ) {
        const message = formatJiraErrorResponse(err.response.data);
        const isPidParentProjectValidation =
          message.toLowerCase().includes("issues with this issue type") &&
          message.toLowerCase().includes("same project as the parent");

        // Jira can reject PUT /issue for Task -> Sub-task conversion with parent even when data is valid.
        // Fall back to bulk move API, which is the documented flow for move/change type+parent semantics.
        if (
          isPidParentProjectValidation &&
          parentIssueKey &&
          resolvedIssueTypeId &&
          parentProjectKey
        ) {
          try {
            const moveRes = await client.post<{ taskId: string }>(
              `${JIRA_API_BASE}/bulk/issues/move`,
              {
                targetToSourcesMapping: {
                  [`${parentProjectKey},${resolvedIssueTypeId},${parentIssueKey}`]: {
                    issueIdsOrKeys: [issueIdOrKey],
                    inferFieldDefaults: true,
                    inferStatusDefaults: true,
                    inferSubtaskTypeDefault: true,
                  },
                },
              },
            );

            const taskId = moveRes.data?.taskId;
            if (!taskId) {
              throw new JiraClientError("Bulk move did not return a task id.", 500);
            }

            for (let i = 0; i < 15; i++) {
              const statusRes = await client.get<{
                status?: string;
                errors?: unknown;
                error?: string;
              }>(`${JIRA_API_BASE}/bulk/queue/${taskId}`);
              const status = (statusRes.data?.status ?? "").toUpperCase();
              if (status === "SUCCESS" || status === "COMPLETED") break;
              if (status === "FAILED" || status === "CANCELLED") {
                throw new JiraClientError(
                  `Bulk move failed: ${JSON.stringify(statusRes.data?.errors ?? statusRes.data?.error ?? status)}`,
                  400,
                );
              }
              await new Promise((resolve) => setTimeout(resolve, 1000));
            }

            const postMoveFields: Record<string, unknown> = { ...fields };
            delete postMoveFields.parent;
            delete postMoveFields.project;
            delete postMoveFields.issuetype;
            if (Object.keys(postMoveFields).length > 0) {
              await client.put(`${JIRA_API_BASE}/issue/${issueIdOrKey}`, {
                fields: postMoveFields,
              });
            }
          } catch (moveErr) {
            if (
              axios.isAxiosError(moveErr) &&
              moveErr.response &&
              moveErr.response.status >= 400 &&
              moveErr.response.status < 500
            ) {
              const moveMessage = formatJiraErrorResponse(moveErr.response.data);
              throw new JiraClientError(moveMessage, moveErr.response.status);
            }
            throw moveErr;
          }
        } else {
          throw new JiraClientError(message, err.response.status);
        }
      } else {
        throw err;
      }
    }

    const getRes = await client.get<{
      id: string;
      key: string;
      fields: JiraIssue["fields"];
    }>(`${JIRA_API_BASE}/issue/${issueIdOrKey}`, {
      params: {
        fields: "summary,status,issuetype,priority,assignee",
      },
    });
    return {
      id: getRes.data.id,
      key: getRes.data.key,
      fields: getRes.data.fields,
    };
  }

  async getIssueTypes(token: PlatformToken, projectId: string): Promise<JiraIssueType[]> {
    const client = this.createAxiosClient(token);

    const response = await client.get<
      Array<{
        id: string;
        name: string;
        description?: string;
        iconUrl?: string;
      }>
    >(`${JIRA_API_BASE}/issuetype/project`, {
      params: { projectId },
    });

    const list = Array.isArray(response.data) ? response.data : [];
    return list.map((it: { id: string; name: string; description?: string; iconUrl?: string }) => ({
      id: it.id,
      name: it.name,
      description: it.description,
      iconUrl: it.iconUrl,
    }));
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
    >(`${JIRA_API_BASE}/priority`);
    const list = Array.isArray(response.data) ? response.data : [];
    return list.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      iconUrl: p.iconUrl,
    }));
  }

  async getPrioritiesForProject(
    token: PlatformToken,
    projectKey: string,
    issueTypeId?: string,
  ): Promise<JiraPriority[]> {
    try {
      const client = this.createAxiosClient(token);

      const issueTypesResponse = await client.get(
        `${JIRA_API_BASE}/issue/createmeta/${projectKey}/issuetypes`,
      );

      const issueTypes = issueTypesResponse.data?.issueTypes ?? [];

      const selectedIssueType = issueTypeId
        ? issueTypes.find((it: ProjectIssueType) => it.id === issueTypeId)
        : issueTypes[0];

      if (!selectedIssueType) {
        return [];
      }

      const selectedIssueTypeId = selectedIssueType.id;

      const fieldsResponse = await client.get(
        `${JIRA_API_BASE}/issue/createmeta/${projectKey}/issuetypes/${selectedIssueTypeId}`,
      );

      const fields = fieldsResponse.data?.fields ?? [];

      const priorityField = fields.find((field: JiraField) => field.key === "priority");

      const priorities = priorityField?.allowedValues ?? [];

      // fallback if project does not expose priority
      if (!priorities.length) {
        return this.getPriorities(token);
      }

      return priorities.map((p: JiraPriority) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        iconUrl: p.iconUrl,
      }));
    } catch {
      // If user doesn't have create permission
      return this.getPriorities(token);
    }
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
    >(`${JIRA_API_BASE}/user/assignable/search`, {
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

  async createTask(token: PlatformToken, payload: CreateJiraTaskPayload): Promise<JiraTask> {
    const client = this.createAxiosClient(token);

    const dueDate =
      payload.dueDate == null || payload.dueDate === ""
        ? undefined
        : /^\d{4}-\d{2}-\d{2}/.test(payload.dueDate)
          ? payload.dueDate.slice(0, 10)
          : (() => {
              const d = new Date(payload.dueDate);
              if (Number.isNaN(d.getTime()))
                throw new Error("Invalid dueDate. Expected an ISO date/datetime string.");
              return d.toISOString().slice(0, 10);
            })();

    const priority =
      payload.priority == null || payload.priority === ""
        ? undefined
        : /^\d+$/.test(payload.priority)
          ? { id: payload.priority }
          : { name: payload.priority };

    const descriptionTrimmed = payload.description != null ? payload.description.trim() : "";
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
      }>(`${JIRA_API_BASE}/issue`, body);
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
        description?: { content?: Array<{ content?: Array<{ text?: string }> }> } | string;
        project: { id: string; key: string };
        issuetype: { id: string; name: string };
        priority?: { id: string; name: string };
        assignee?: { accountId: string; displayName: string };
        duedate?: string;
      };
    }>(`${JIRA_API_BASE}/issue/${id}`, {
      params: {
        fields: "summary,description,project,issuetype,priority,assignee,duedate",
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
    await client.post(`${JIRA_API_BASE}/issue/${issueIdOrKey}/attachments`, form, {
      headers: {
        "X-Atlassian-Token": "no-check",
        ...form.getHeaders(),
      },
      timeout: 90_000,
      maxContentLength: Infinity,
      maxBodyLength: Infinity,
    });
  }

  async deleteAttachment(token: PlatformToken, attachmentId: string): Promise<void> {
    const client = this.createAxiosClient(token);
    await client.delete(`${JIRA_API_BASE}/attachment/${attachmentId}`);
  }

  async getIssueDetails(token: PlatformToken, issueIdOrKey: string): Promise<JiraIssue> {
    const client = this.createAxiosClient(token);

    const response = await client.get<JiraIssue>(`${JIRA_API_BASE}/issue/${issueIdOrKey}`, {
      headers: { Accept: "application/json" },
      params: {
        fields:
          "summary,status,issuetype,priority,assignee,description,parent,attachment,comment,duedate,subtasks,reporter",
      },
    });

    return response.data;
  }

  async getProjectIssueStatuses(token: PlatformToken, projectKey: string) {
    const client = this.createAxiosClient(token);

    const response = await client.get(`${JIRA_API_BASE}/project/${projectKey}/statuses`);

    return response.data;
  }

  async deleteIssue(token: PlatformToken, issueIdOrKey: string): Promise<number> {
    const client = this.createAxiosClient(token);
    const response = await client.delete(`${JIRA_API_BASE}/issue/${issueIdOrKey}`);
    return response.status;
  }

  async getPermission(
    token: PlatformToken,
    permission: string,
    options?: {
      issueKey?: string;
      projectKey?: string;
    },
  ): Promise<boolean> {
    const client = this.createAxiosClient(token);

    const response = await client.get(`${JIRA_API_BASE}/mypermissions`, {
      params: {
        permissions: permission,
        issueKey: options?.issueKey,
        projectKey: options?.projectKey,
      },
    });

    const permissions = response.data?.permissions;

    if (!permissions) {
      console.warn(`getPermission: "permissions" object missing in response`, response.data);
      return false;
    }

    if (!(permission in permissions)) {
      console.warn(
        `getPermission: permission key "${permission}" missing in response`,
        permissions,
      );
      return false;
    }

    return permissions[permission]?.havePermission ?? false;
  }

  async getIssueComments(
    token: PlatformToken,
    issueIdOrKey: string,
  ): Promise<GetCommentsForIssueResponse> {
    const client = this.createAxiosClient(token);

    const response = await client.get(`${JIRA_API_BASE}/issue/${issueIdOrKey}/comment`);

    return response.data;
  }

  async getCommentDetails(
    token: PlatformToken,
    issueIdOrKey: string,
    commentId: string,
  ): Promise<JiraComment> {
    const client = this.createAxiosClient(token);

    const response = await client.get(
      `${JIRA_API_BASE}/issue/${issueIdOrKey}/comment/${commentId}`,
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
      `${JIRA_API_BASE}/issue/${payload.issueIdOrKey}/comment`,
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
    const defaultJql = 'project != "NONE"';
    const response = await client.post<{
      webhookRegistrationResult: Array<{ createdWebhookId: number } | { errors: string[] }>;
    }>(`${JIRA_API_BASE}/webhook`, {
      url: callbackUrl,
      webhooks: webhooks.map((w) => ({
        events: w.events,
        jqlFilter: w.jqlFilter?.trim() ? w.jqlFilter.trim() : defaultJql,
      })),
    });
    const results = response.data.webhookRegistrationResult ?? [];
    return results.map((r) =>
      "createdWebhookId" in r ? { createdWebhookId: r.createdWebhookId } : { errors: r.errors },
    );
  }

  async getAttachmentContent(
    token: PlatformToken,
    attachmentId: string,
  ): Promise<{ data: ArrayBuffer; contentType: string }> {
    const client = this.createAxiosClient(token);

    const response = await client.get(`${JIRA_API_BASE}/attachment/content/${attachmentId}`, {
      responseType: "arraybuffer",
      headers: {
        Accept: "*/*",
      },
    });

    const rawContentType = response.headers["content-type"];
    const contentType =
      typeof rawContentType === "string" && rawContentType.length > 0
        ? rawContentType
        : "application/octet-stream";

    return {
      data: response.data,
      contentType,
    };
  }

  async issueStatusChange(
    token: PlatformToken,
    issueIdOrKey: string,
    transitionId: string,
  ): Promise<void> {
    const client = this.createAxiosClient(token);

    await client.post(
      `${JIRA_API_BASE}/issue/${issueIdOrKey}/transitions`,
      {
        transition: {
          id: transitionId,
        },
      },
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
      },
    );
  }

  async getIssueTransitions(token: PlatformToken, issueIdOrKey: string) {
    const client = this.createAxiosClient(token);

    const response = await client.get(`${JIRA_API_BASE}/issue/${issueIdOrKey}/transitions`, {
      headers: {
        Accept: "application/json",
      },
    });

    return response.data.transitions;
  }
}
