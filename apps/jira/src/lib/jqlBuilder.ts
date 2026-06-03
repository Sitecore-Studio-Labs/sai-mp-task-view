import type { JiraIssueFilters } from "@/types/jira";

function escapeJqlValue(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function buildProjectIssuesJql(projectKey: string, filters?: JiraIssueFilters): string {
  const clauses: string[] = [`project = "${escapeJqlValue(projectKey)}"`];

  if (filters?.assignee?.length) {
    const hasUnassigned = filters.assignee.includes("unassigned");
    const assignedUsers = filters.assignee.filter((a) => a !== "unassigned");

    const assigneeClauses: string[] = [];

    if (assignedUsers.length) {
      assigneeClauses.push(
        `assignee IN (${assignedUsers.map((a) => `"${escapeJqlValue(a)}"`).join(", ")})`,
      );
    }

    if (hasUnassigned) {
      assigneeClauses.push(`assignee IS EMPTY`);
    }

    clauses.push(`(${assigneeClauses.join(" OR ")})`);
  }

  if (filters?.priority?.length) {
    clauses.push(
      `priority IN (${filters.priority.map((p) => `"${escapeJqlValue(p)}"`).join(", ")})`,
    );
  }

  if (filters?.status?.length) {
    clauses.push(`status IN (${filters.status.map((s) => `"${escapeJqlValue(s)}"`).join(", ")})`);
  }

  return clauses.join(" AND ");
}
