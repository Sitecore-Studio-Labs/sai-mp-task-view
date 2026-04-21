import type {
  GetTasksOptions,
  PlatformProject,
  PlatformTask,
  TaskPlatformProvider,
} from "@sai-mp-jira-task-view/platform";

import { JiraBffClient, type JiraBffTransportOptions } from "./jira-bff-client";

export type JiraTaskPlatformProviderOptions = JiraBffTransportOptions;

type JiraProjectDto = { id: string; key: string; name: string };

type JiraIssueListItem = {
  id: string;
  key: string;
  fields?: {
    summary?: string;
    status?: { name?: string };
    issuetype?: { name?: string; iconUrl?: string };
  };
};

function mapProject(p: JiraProjectDto): PlatformProject {
  return { id: p.id, key: p.key, name: p.name };
}

function mapIssue(i: JiraIssueListItem): PlatformTask {
  const issuetype = i.fields?.issuetype;
  return {
    id: i.id,
    key: i.key,
    title: i.fields?.summary ?? i.key,
    statusName: i.fields?.status?.name,
    issueType:
      issuetype?.name != null && issuetype.name !== ""
        ? { name: issuetype.name, iconUrl: issuetype.iconUrl }
        : undefined,
  };
}

/**
 * PHASE 2.5 — Jira implementation of {@link TaskPlatformProvider} (migration-mvp-guide).
 * Uses the existing Next.js BFF routes under `/api/jira/*` (same-origin, credentials).
 */
export class JiraTaskPlatformProvider implements TaskPlatformProvider {
  private readonly http: JiraBffClient;

  constructor(options?: JiraTaskPlatformProviderOptions) {
    this.http = new JiraBffClient(options ?? {});
  }

  async getProjects(): Promise<PlatformProject[]> {
    const res = await this.http.fetch("/api/jira/projects");
    const data: unknown = await res.json();

    if (!res.ok) {
      const err =
        typeof data === "object" && data !== null && "error" in data
          ? String((data as { error?: string }).error)
          : `HTTP ${res.status}`;
      throw new Error(err || "Failed to load projects.");
    }

    if (!Array.isArray(data)) {
      return [];
    }

    return (data as JiraProjectDto[]).map(mapProject);
  }

  async getTasks(projectKey: string, options?: GetTasksOptions): Promise<PlatformTask[]> {
    const key = projectKey.trim();
    if (!key) return [];

    const qs = new URLSearchParams({ projectKey: key });
    const text = options?.query?.trim();
    if (text) qs.set("query", text);
    const path = `/api/jira/issues?${qs.toString()}`;
    const res = await this.http.fetch(path);
    const data: unknown = await res.json();

    if (!res.ok) {
      const err =
        typeof data === "object" && data !== null && "error" in data
          ? String((data as { error?: string }).error)
          : `HTTP ${res.status}`;
      throw new Error(err || "Failed to load tasks.");
    }

    if (typeof data !== "object" || data === null || !("issues" in data)) {
      return [];
    }

    const issues = (data as { issues?: JiraIssueListItem[] }).issues ?? [];
    return issues.map(mapIssue);
  }
}
