import type {
  CreateJiraTaskPayload,
  JiraIssue,
  JiraProjectIssuesResponse,
  JiraTask,
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

/**
 * Jira-only surface (issues meta, CRUD, filters). Kept out of {@link TaskPlatformProvider}
 * so the core contract stays reusable for other task platforms.
 */
export interface JiraExtensionProvider {
  getProjectIssuesPage(params: JiraProjectIssuesListParams): Promise<JiraProjectIssuesResponse>;
  getIssueDetails(issueIdOrKey: string): Promise<JiraIssue>;
  createIssue(payload: CreateJiraTaskPayload): Promise<JiraTask>;
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
}

export function createJiraExtensionProvider(
  options?: JiraBffTransportOptions,
): JiraExtensionProvider {
  return new JiraExtensionProviderImpl(new JiraBffClient(options));
}
