import axios, {
  AxiosError,
  AxiosHeaders,
  AxiosInstance,
  AxiosRequestConfig,
  AxiosResponse,
} from 'axios';
import type { PlatformAdapter } from '@/platforms/base/PlatformAdapter';
import type {
  JiraProject,
  JiraIssue,
  JiraIssueType,
  JiraTask,
  CreateJiraTaskPayload,
  JiraPriority,
  JiraUser,
} from '@/types/jira';
import type { PlatformToken } from '@/types/platform';
import { InternalAxiosRequestConfig } from 'node_modules/axios/index.cjs';

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
        'Jira client credentials are not configured. Check JIRA_CLIENT_ID and JIRA_CLIENT_SECRET.',
      );
    }
  }

  private createAxiosClient(initialToken: PlatformToken): AxiosInstance {
    let activeToken = initialToken;

    const instance = axios.create({
      baseURL: this.jiraBaseUrl,
    });

    instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
      if (!config.headers) {
        config.headers = new AxiosHeaders();
      } else if (!(config.headers instanceof AxiosHeaders)) {
        config.headers = new AxiosHeaders(
          config.headers as unknown as Record<string, string>,
        );
      }

      config.headers.set('Authorization', `Bearer ${activeToken.accessToken}`);
      config.headers.set('Accept', 'application/json');
      config.headers.set('Content-Type', 'application/json');
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

        if (!originalRequest.headers) {
          originalRequest.headers = new AxiosHeaders();
        } else if (!(originalRequest.headers instanceof AxiosHeaders)) {
          originalRequest.headers = new AxiosHeaders(
            originalRequest.headers as unknown as Record<string, string>,
          );
        }
        originalRequest.headers.set(
          'Authorization',
          `Bearer ${newToken.accessToken}`,
        );

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
      'https://auth.atlassian.com/oauth/token',
      {
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: authCode,
        redirect_uri: redirectUri,
      },
      {
        headers: {
          'Content-Type': 'application/json',
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
      tokenType: 'bearer',
    };
  }

  async refreshToken(token: PlatformToken): Promise<PlatformToken> {
    const response = await axios.post(
      'https://auth.atlassian.com/oauth/token',
      {
        grant_type: 'refresh_token',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        refresh_token: token.refreshToken,
      },
      {
        headers: {
          'Content-Type': 'application/json',
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
      tokenType: 'bearer',
    };
  }

  async getProjects(token: PlatformToken): Promise<JiraProject[]> {
    const client = this.createAxiosClient(token);
    const response = await client.get<{
      values: Array<{ id: string; key: string; name: string }>;
    }>('/rest/api/3/project/search');

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

    const response = await client.get('/rest/api/3/search/jql', {
      params: {
        jql: `project = ${projectKey}`,
        fields: [
          'summary',
          'status',
          'assignee',
          'priority',
          'issuetype',
          'created',
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
    projectIdOrKey: string,
  ): Promise<JiraIssueType[]> {
    const client = this.createAxiosClient(token);
    const response = await client.get<
      Array<{ id: string; name: string; description?: string }>
    >('/rest/api/3/issuetype/project', {
      params: { projectId: projectIdOrKey },
    });
    const list = Array.isArray(response.data) ? response.data : [];
    return list.map(
      (it: { id: string; name: string; description?: string }) => ({
        id: it.id,
        name: it.name,
        description: it.description,
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
    >('/rest/api/3/priority');
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
    >('/rest/api/3/user/assignable/search', {
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
      payload.dueDate == null || payload.dueDate === ''
        ? undefined
        : /^\d{4}-\d{2}-\d{2}/.test(payload.dueDate)
          ? payload.dueDate.slice(0, 10)
          : (() => {
              const d = new Date(payload.dueDate);
              if (Number.isNaN(d.getTime()))
                throw new Error(
                  'Invalid dueDate. Expected an ISO date/datetime string.',
                );
              return d.toISOString().slice(0, 10);
            })();

    const priority =
      payload.priority == null || payload.priority === ''
        ? undefined
        : /^\d+$/.test(payload.priority)
          ? { id: payload.priority }
          : { name: payload.priority };

    const body = {
      fields: {
        project: { id: payload.projectId },
        issuetype: { id: payload.issueTypeId },
        summary: payload.summary,
        ...(payload.description != null &&
          payload.description !== '' && {
            description: {
              type: 'doc',
              version: 1,
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: payload.description }],
                },
              ],
            },
          }),
        ...(priority && { priority }),
        ...(payload.assignee != null &&
          payload.assignee !== '' && {
            assignee: { accountId: payload.assignee },
          }),
        ...(dueDate && { duedate: dueDate }),
      },
    };
    const response = await client.post<{
      id: string;
      key: string;
      self: string;
    }>('/rest/api/3/issue', body);
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
          'summary,description,project,issuetype,priority,assignee,duedate',
      },
    });
    const f = issueResponse.data.fields;
    const description =
      typeof f.description === 'string'
        ? f.description
        : f.description?.content
            ?.map((c) => c.content?.map((t) => t.text ?? '').join(''))
            .join('\n');
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

  async deleteIssue(token: PlatformToken, issueIdOrKey: string): Promise<number> {
    const client = this.createAxiosClient(token);
    const response = await client.delete(`/rest/api/3/issue/${issueIdOrKey}`);
    return response.status;
  }
}
