import { useQuery } from "@tanstack/react-query";

import { taskPlatform } from "@/lib/task-platform";
import type { JiraIssueOption } from "@/types/jira";

const JIRA_PROJECT_ISSUES_QUERY_KEY = ["jira", "projectIssues"] as const;

/**
 * Fetches issues in a project for the parent-issue dropdown (create/edit task).
 *
 * PHASE 3.3 — Uses {@link taskPlatform} only (no direct `/api/jira` client calls).
 * - `projectKey` matches BFF expectations (JQL `project = KEY`).
 * - Optional `searchQuery` is forwarded as provider `query` (same param the axios client used).
 */
export function useJiraProjectIssues(projectKey: string | null, searchQuery?: string) {
  return useQuery({
    queryKey: [...JIRA_PROJECT_ISSUES_QUERY_KEY, projectKey, searchQuery ?? ""],
    queryFn: async (): Promise<JiraIssueOption[]> => {
      if (!projectKey?.trim()) return [];
      const tasks = await taskPlatform.getTasks(projectKey.trim(), {
        query: searchQuery?.trim() || undefined,
      });
      return tasks.map((t) => ({
        id: t.id,
        key: t.key,
        summary: t.title,
        issueType: t.issueType,
      }));
    },
    enabled: !!projectKey?.trim(),
  });
}
