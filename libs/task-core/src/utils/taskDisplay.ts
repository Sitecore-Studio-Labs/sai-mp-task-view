import type { ParentIssueOption } from "../types/create-task";
import type { PlatformTask } from "../types/platform";

export type TaskKeyDisplay = "key" | "summary";

type TaskLike = Pick<PlatformTask, "key"> & {
  fields: Pick<PlatformTask["fields"], "summary">;
};

export function getTaskDisplayIdentifier(task: TaskLike, display: TaskKeyDisplay = "key"): string {
  if (display === "summary") {
    return task.fields.summary?.trim() || task.key;
  }
  return task.key;
}

export function getParentIssueDisplayIdentifier(
  issue: Pick<ParentIssueOption, "key" | "summary">,
  display: TaskKeyDisplay = "key",
): string {
  if (display === "summary") {
    return issue.summary?.trim() || issue.key;
  }
  return issue.key;
}

export function getScopeDisplayName(
  options: { name?: string | null; key?: string | null },
  display: TaskKeyDisplay = "key",
): string {
  const name = options.name?.trim();
  if (name) return name;
  if (display === "key" && options.key) return options.key;
  return "Not selected";
}

export function shouldShowKeyIdentifier(display: TaskKeyDisplay = "key"): boolean {
  return display === "key";
}
