import type {
  CreateCommentPayload,
  CreateJiraTaskPayload,
  GetCommentsForIssueResponse,
  JiraComment,
  JiraIssue,
  JiraIssueTransition,
  JiraIssueType,
  JiraPermission,
  JiraPriority,
  JiraProjectIssuesResponse,
  JiraProjectStatuses,
  JiraSite,
  JiraTask,
  JiraUser,
  UpdateJiraTaskPayload,
} from "@sai-mp-jira-task-view/data-access";

import { JiraBffClient, type JiraBffTransportOptions } from "./jira-bff-client";

export type JiraProjectIssuesListParams = {
  projectKey: string;
  cursor?: string;
  filters?: {
    assignee?: string[];
    priority?: string[];
    status?: string[];
    query?: string;
  };
};

export type JiraIssuePermissionResponse = {
  hasPermission: boolean;
};

export type JiraTransitionIssueResult = {
  success: boolean;
  message: string;
};

export type JiraSitesSnapshot = {
  resources: JiraSite[];
  selectedSite: string | null;
  selectedProject: string | null;
};

/**
 * Jira-only surface (issues meta, CRUD, filters). Kept out of {@link TaskPlatformProvider}
 * so the core contract stays reusable for other task platforms.
 */
export interface JiraExtensionProvider {
  getProjectIssuesPage(params: JiraProjectIssuesListParams): Promise<JiraProjectIssuesResponse>;
  getIssueDetails(issueIdOrKey: string): Promise<JiraIssue>;
  createIssue(payload: CreateJiraTaskPayload): Promise<JiraTask>;
  getAssignees(projectIdOrKey: string, searchQuery?: string): Promise<JiraUser[]>;
  getProjectIssueStatuses(projectKey: string): Promise<JiraProjectStatuses[]>;
  getCommentsForIssue(issueIdOrKey: string): Promise<GetCommentsForIssueResponse>;
  updateIssue(issueIdOrKey: string, payload: UpdateJiraTaskPayload): Promise<void>;
  getIssueTransitions(issueIdOrKey: string): Promise<JiraIssueTransition[]>;
  transitionIssue(issueIdOrKey: string, transitionId: string): Promise<JiraTransitionIssueResult>;
  getIssuePermission(params: {
    issueIdOrKey?: string | null;
    projectKey?: string | null;
    permission: JiraPermission;
  }): Promise<JiraIssuePermissionResponse>;
  getCommentDetails(issueIdOrKey: string, commentId: string): Promise<JiraComment>;
  createComment(payload: CreateCommentPayload): Promise<JiraComment>;
  deleteIssue(issueIdOrKey: string): Promise<void>;
  getAttachmentBlob(attachmentId: string): Promise<Blob>;
  uploadAttachment(issueIdOrKey: string, file: File, signal?: AbortSignal): Promise<void>;
  deleteAttachment(attachmentId: string): Promise<void>;
  getJiraSites(): Promise<JiraSitesSnapshot>;
  selectJiraSite(payload: { cloudId: string }): Promise<{ success: boolean }>;
  selectJiraProject(payload: { projectKey: string }): Promise<{ success: boolean }>;
  getProjectPriorities(projectKey: string): Promise<JiraPriority[]>;
  getIssueTypes(projectIdOrKey: string): Promise<JiraIssueType[]>;
  getCurrentUser(): Promise<JiraUser>;
  getConnectionStatus(): Promise<{ connected: boolean }>;
  disconnectJira(): Promise<void>;
}

function errorMessageFromBody(data: unknown, fallback: string): string {
  if (typeof data === "object" && data !== null && "error" in data) {
    const msg = (data as { error?: unknown }).error;
    if (typeof msg === "string" && msg !== "") return msg;
  }
  return fallback;
}

export class JiraExtensionProviderImpl implements JiraExtensionProvider {
  constructor(private readonly http: JiraBffClient) {}

  async getProjectIssuesPage(
    params: JiraProjectIssuesListParams,
  ): Promise<JiraProjectIssuesResponse> {
    const key = params.projectKey.trim();
    if (!key) {
      return { issues: [], isLast: true };
    }

    const qs = new URLSearchParams({ projectKey: key });
    if (params.cursor) qs.set("cursor", params.cursor);
    params.filters?.status?.forEach((s) => qs.append("status", s));
    params.filters?.priority?.forEach((p) => qs.append("priority", p));
    params.filters?.assignee?.forEach((a) => qs.append("assignee", a));
    const text = params.filters?.query?.trim();
    if (text) qs.set("query", text);

    const res = await this.http.fetch(`/api/jira/issues?${qs.toString()}`);
    const data = (await res.json()) as unknown;

    if (!res.ok) {
      throw new Error(errorMessageFromBody(data, "Failed to load issues."));
    }

    if (typeof data !== "object" || data === null || !("issues" in data)) {
      return { issues: [], isLast: true };
    }

    return data as JiraProjectIssuesResponse;
  }

  async getIssueDetails(issueIdOrKey: string): Promise<JiraIssue> {
    const id = issueIdOrKey.trim();
    if (!id) {
      throw new Error("Missing issue id or key.");
    }

    const res = await this.http.fetch(`/api/jira/issues/${encodeURIComponent(id)}`);
    const data = await res.json();

    if (!res.ok) {
      throw new Error(errorMessageFromBody(data, "Failed to load issue."));
    }

    return data as JiraIssue;
  }

  async createIssue(payload: CreateJiraTaskPayload): Promise<JiraTask> {
    const res = await this.http.fetch("/api/jira/issues", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(errorMessageFromBody(data, "Failed to create issue."));
    }

    return data as JiraTask;
  }

  async getAssignees(projectIdOrKey: string, searchQuery?: string): Promise<JiraUser[]> {
    const id = projectIdOrKey.trim();
    if (!id) return [];

    const qs = new URLSearchParams({ projectId: id });
    const q = searchQuery?.trim();
    if (q) qs.set("query", q);

    const res = await this.http.fetch(`/api/jira/assignees?${qs.toString()}`);
    const data = (await res.json()) as unknown;

    if (!res.ok) {
      throw new Error(errorMessageFromBody(data, "Failed to load assignees."));
    }

    if (!Array.isArray(data)) {
      return [];
    }

    return data as JiraUser[];
  }

  async getProjectIssueStatuses(projectKey: string): Promise<JiraProjectStatuses[]> {
    const key = projectKey.trim();
    if (!key) return [];

    const res = await this.http.fetch(`/api/jira/statuses/${encodeURIComponent(key)}`);
    const data = (await res.json()) as unknown;

    if (!res.ok) {
      throw new Error(errorMessageFromBody(data, "Failed to load statuses."));
    }

    if (!Array.isArray(data)) {
      return [];
    }

    return data as JiraProjectStatuses[];
  }

  async getCommentsForIssue(issueIdOrKey: string): Promise<GetCommentsForIssueResponse> {
    const id = issueIdOrKey.trim();
    if (!id) {
      return { startAt: 0, maxResults: 0, total: 0, comments: [] };
    }

    const qs = new URLSearchParams({ issueIdOrKey: id });
    const res = await this.http.fetch(`/api/jira/comments?${qs.toString()}`);
    const data = (await res.json()) as unknown;

    if (!res.ok) {
      throw new Error(errorMessageFromBody(data, "Failed to load comments."));
    }

    return data as GetCommentsForIssueResponse;
  }

  async updateIssue(issueIdOrKey: string, payload: UpdateJiraTaskPayload): Promise<void> {
    const id = issueIdOrKey.trim();
    if (!id) {
      throw new Error("Missing issue id or key.");
    }

    const res = await this.http.fetch(`/api/jira/issues/${encodeURIComponent(id)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(errorMessageFromBody(data, "Failed to update issue."));
    }
  }

  async getIssueTransitions(issueIdOrKey: string): Promise<JiraIssueTransition[]> {
    const id = issueIdOrKey.trim();
    if (!id) return [];

    const res = await this.http.fetch(`/api/jira/issues/${encodeURIComponent(id)}/transitions`);
    const data = (await res.json()) as unknown;

    if (!res.ok) {
      throw new Error(errorMessageFromBody(data, "Failed to load transitions."));
    }

    if (typeof data !== "object" || data === null || !("transitions" in data)) {
      return [];
    }

    const transitions = (data as { transitions?: JiraIssueTransition[] }).transitions;
    return Array.isArray(transitions) ? transitions : [];
  }

  async transitionIssue(
    issueIdOrKey: string,
    transitionId: string,
  ): Promise<JiraTransitionIssueResult> {
    const id = issueIdOrKey.trim();
    if (!id) {
      throw new Error("Missing issue id or key.");
    }
    const tid = transitionId.trim();
    if (!tid) {
      throw new Error("Missing transition id.");
    }

    const res = await this.http.fetch(`/api/jira/issues/${encodeURIComponent(id)}/transitions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transitionId: tid }),
    });

    const data = (await res.json()) as unknown;

    if (!res.ok) {
      throw new Error(errorMessageFromBody(data, "Failed to transition issue."));
    }

    return data as JiraTransitionIssueResult;
  }

  async getIssuePermission(params: {
    issueIdOrKey?: string | null;
    projectKey?: string | null;
    permission: JiraPermission;
  }): Promise<JiraIssuePermissionResponse> {
    const qs = new URLSearchParams();
    qs.set("permission", String(params.permission));
    const issue = params.issueIdOrKey?.trim();
    const project = params.projectKey?.trim();
    if (issue) qs.set("issueIdOrKey", issue);
    if (project) qs.set("projectKey", project);

    const res = await this.http.fetch(`/api/jira/permissions?${qs.toString()}`);
    const data = (await res.json()) as unknown;

    if (!res.ok) {
      throw new Error(errorMessageFromBody(data, "Failed to load permission."));
    }

    return data as JiraIssuePermissionResponse;
  }

  async getCommentDetails(issueIdOrKey: string, commentId: string): Promise<JiraComment> {
    const issue = issueIdOrKey.trim();
    const cid = commentId.trim();
    if (!issue || !cid) {
      throw new Error("Missing issueIdOrKey or commentId.");
    }

    const qs = new URLSearchParams({ issueIdOrKey: issue });
    const res = await this.http.fetch(
      `/api/jira/comments/${encodeURIComponent(cid)}?${qs.toString()}`,
    );
    const data = await res.json();

    if (!res.ok) {
      throw new Error(errorMessageFromBody(data, "Failed to load comment."));
    }

    return data as JiraComment;
  }

  async createComment(payload: CreateCommentPayload): Promise<JiraComment> {
    const res = await this.http.fetch("/api/jira/comments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(errorMessageFromBody(data, "Failed to create comment."));
    }

    return data as JiraComment;
  }

  async deleteIssue(issueIdOrKey: string): Promise<void> {
    const id = issueIdOrKey.trim();
    if (!id) {
      throw new Error("Missing issue id or key.");
    }

    const res = await this.http.fetch(`/api/jira/issues/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(errorMessageFromBody(data, "Failed to delete issue."));
    }
  }

  async getAttachmentBlob(attachmentId: string): Promise<Blob> {
    const id = attachmentId.trim();
    if (!id) {
      throw new Error("Missing attachment id.");
    }

    const res = await this.http.fetch(`/api/jira/attachment/${encodeURIComponent(id)}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(errorMessageFromBody(data, "Failed to load attachment."));
    }
    return res.blob();
  }

  async uploadAttachment(issueIdOrKey: string, file: File, signal?: AbortSignal): Promise<void> {
    const key = issueIdOrKey.trim();
    if (!key) {
      throw new Error("Missing issue id or key.");
    }

    const formData = new FormData();
    formData.append("file", file);
    const qs = new URLSearchParams({ issueIdOrKey: key });
    const res = await this.http.fetch(`/api/jira/attachment/upload?${qs.toString()}`, {
      method: "POST",
      body: formData,
      signal,
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(errorMessageFromBody(data, "Failed to upload attachment."));
    }
  }

  async deleteAttachment(attachmentId: string): Promise<void> {
    const id = attachmentId.trim();
    if (!id) {
      throw new Error("Missing attachment id.");
    }

    const res = await this.http.fetch(`/api/jira/attachment/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(errorMessageFromBody(data, "Failed to delete attachment."));
    }
  }

  async getJiraSites(): Promise<JiraSitesSnapshot> {
    const res = await this.http.fetch("/api/jira/sites");
    const data = (await res.json()) as unknown;

    if (!res.ok) {
      throw new Error(errorMessageFromBody(data, "Failed to load Jira sites."));
    }

    return data as JiraSitesSnapshot;
  }

  async selectJiraSite(payload: { cloudId: string }): Promise<{ success: boolean }> {
    const res = await this.http.fetch("/api/jira/select-site", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as unknown;

    if (!res.ok) {
      throw new Error(errorMessageFromBody(data, "Failed to select site."));
    }

    return data as { success: boolean };
  }

  async selectJiraProject(payload: { projectKey: string }): Promise<{ success: boolean }> {
    const res = await this.http.fetch("/api/jira/select-project", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as unknown;

    if (!res.ok) {
      throw new Error(errorMessageFromBody(data, "Failed to select project."));
    }

    return data as { success: boolean };
  }

  async getProjectPriorities(projectKey: string): Promise<JiraPriority[]> {
    const key = projectKey.trim();
    if (!key) return [];

    const qs = new URLSearchParams({ projectKey: key });
    const res = await this.http.fetch(`/api/jira/project-priorities?${qs.toString()}`);
    const data = (await res.json()) as unknown;

    if (!res.ok) {
      throw new Error(errorMessageFromBody(data, "Failed to load priorities."));
    }

    if (!Array.isArray(data)) {
      return [];
    }

    return data as JiraPriority[];
  }

  async getIssueTypes(projectIdOrKey: string): Promise<JiraIssueType[]> {
    const id = projectIdOrKey.trim();
    if (!id) return [];

    const qs = new URLSearchParams({ projectId: id });
    const res = await this.http.fetch(`/api/jira/issue-types?${qs.toString()}`);
    const data = (await res.json()) as unknown;

    if (!res.ok) {
      throw new Error(errorMessageFromBody(data, "Failed to load issue types."));
    }

    if (!Array.isArray(data)) {
      return [];
    }

    return data as JiraIssueType[];
  }

  async getCurrentUser(): Promise<JiraUser> {
    const res = await this.http.fetch("/api/jira/current-user");
    const data = await res.json();

    if (!res.ok) {
      throw new Error(errorMessageFromBody(data, "Failed to load current user."));
    }

    return data as JiraUser;
  }

  async getConnectionStatus(): Promise<{ connected: boolean }> {
    const res = await this.http.fetch("/api/auth/jira/status");
    const data = await res.json();

    if (!res.ok) {
      throw new Error(errorMessageFromBody(data, "Failed to load connection status."));
    }

    return data as { connected: boolean };
  }

  async disconnectJira(): Promise<void> {
    const res = await this.http.fetch("/api/auth/jira/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(errorMessageFromBody(data, "Failed to disconnect."));
    }
  }
}

export function createJiraExtensionProvider(
  options?: JiraBffTransportOptions,
): JiraExtensionProvider {
  return new JiraExtensionProviderImpl(new JiraBffClient(options));
}
