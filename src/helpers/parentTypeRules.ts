import type { PlatformType } from "@/types/platform-entities";

/**
 * Jira-specific hierarchy: determines which issue types can serve as parents
 * for a given child issue type.
 */
function getAllowedParentIssueTypeNames(childIssueTypeName: string): Set<string> {
  const n = childIssueTypeName.toLowerCase();
  if (n.includes("subtask") || n === "sub-task")
    return new Set(["Story", "Task", "Bug", "Sub-task", "Subtask"]);
  if (n.includes("story")) return new Set(["Epic"]);
  if (n.includes("task") && !n.includes("sub")) return new Set(["Epic"]);
  if (n.includes("bug")) return new Set(["Epic"]);
  return new Set();
}

/**
 * Returns allowed parent issue type names for the given platform and child type.
 * Platforms without issue-type hierarchy (e.g. Wrike) return an empty set,
 * meaning all tasks are valid parents.
 */
export function getParentTypeRulesForPlatform(
  platform: PlatformType,
  childIssueTypeName: string,
): Set<string> {
  if (platform === "jira") return getAllowedParentIssueTypeNames(childIssueTypeName);
  return new Set();
}
