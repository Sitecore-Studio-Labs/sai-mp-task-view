import { JiraIssueFilters } from "@/types/jira";

export function buildProjectIssuesJql(
  projectKey: string,
  filters?: JiraIssueFilters,
) {
  const clauses: string[] = [`project = "${projectKey}"`];

  if (filters?.assignee?.length) {
    clauses.push(
      `assignee IN (${filters.assignee.map((a) => `"${a}"`).join(", ")})`,
    );
  }

  if (filters?.priority?.length) {
    clauses.push(
      `priority IN (${filters.priority.map((p) => `"${p}"`).join(", ")})`,
    );
  }

  if (filters?.status?.length) {
    clauses.push(
      `status IN (${filters.status.map((s) => `"${s}"`).join(", ")})`,
    );
  }

  return clauses.join(" AND ");
}
