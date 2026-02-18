import axios, {
  AxiosError,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from "axios";
import type { PlatformAdapter } from "@/platforms/base/PlatformAdapter";
import type { JiraIssue, JiraProject, UpdateJiraTaskPayload } from "@/types/jira";
import type { PlatformToken } from "@/types/platform";
import { InternalAxiosRequestConfig } from "node_modules/axios/index.cjs";

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
      config.headers.Authorization = `Bearer ${activeToken.accessToken}`;
      config.headers.Accept = "application/json";
      config.headers["Content-Type"] = "application/json";
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
        originalRequest.headers.Authorization = `Bearer ${newToken.accessToken}`;

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

  async getProjectIssues(
    token: PlatformToken,
    projectKey: string,
    cursor?: string,
  ): Promise<{
    issues: JiraIssue[];
    nextPageToken?: string;
    isLast: boolean;
  }> {
    const client = this.createAxiosClient(token);

    const response = await client.get("/rest/api/3/search/jql", {
      params: {
        jql: `project = ${projectKey}`,
        fields: [
          "summary",
          "status",
          "assignee",
          "priority",
          "issuetype",
          "created",
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
    if (payload.summary !== undefined) fields.summary = payload.summary;
    if (payload.description !== undefined) {
      fields.description =
        payload.description === "" || payload.description == null
          ? null
          : {
              type: "doc",
              version: 1,
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: payload.description }],
                },
              ],
            };
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
      }>(`/rest/api/3/issue/${issueIdOrKey}`, {
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

    await client.put(`/rest/api/3/issue/${issueIdOrKey}`, { fields });

    const getRes = await client.get<{
      id: string;
      key: string;
      fields: JiraIssue["fields"];
    }>(`/rest/api/3/issue/${issueIdOrKey}`, {
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
}
