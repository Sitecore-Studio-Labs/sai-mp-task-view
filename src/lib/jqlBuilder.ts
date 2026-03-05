import { JiraIssueFilters } from "@/types/jira";

export function buildProjectIssuesJql(
  projectKey: string,
  filters?: JiraIssueFilters,
) {
  const clauses: string[] = [`project = "${projectKey}"`];

  if (filters?.assignee?.length) {
    const hasUnassigned = filters.assignee.includes('unassigned');
    const assignedUsers = filters.assignee.filter((a) => a !== 'unassigned');

    const assigneeClauses: string[] = [];

    if (assignedUsers.length) {
      assigneeClauses.push(
        `assignee IN (${assignedUsers.map((a) => `"${a}"`).join(", ")})`,
      );
    }

    if (hasUnassigned) {
      assigneeClauses.push(`assignee IS EMPTY`);
    }

    clauses.push(`(${assigneeClauses.join(" OR ")})`);
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
