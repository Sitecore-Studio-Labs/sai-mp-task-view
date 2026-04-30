import type { AssigneeOption } from "@mp/task-core";
import { toast } from "sonner";

import { JIRA_API_PATHS } from "@/lib/apiPaths";
import { apiClient } from "@/lib/axiosClient";
import type { JiraUser } from "@/types/jira";

export const ASSIGNEE_SEARCH_DEBOUNCE_MS = 300;
export const PARENT_ISSUE_SEARCH_DEBOUNCE_MS = 300;

export function mapJiraUserToAssignee(u: JiraUser): AssigneeOption {
  return {
    id: u.accountId,
    displayName: u.displayName,
    avatarUrl: u.avatarUrls?.["24x24"],
  };
}

/**
 * Returns the set of allowed parent issue type names for a given child issue type.
 * Based on standard Jira hierarchy: Sub-tasks nest under Story/Task/Bug, others under Epic.
 */
export function getAllowedParentIssueTypeNames(childIssueTypeName: string): Set<string> {
  const n = childIssueTypeName.toLowerCase();
  if (n.includes("subtask") || n === "sub-task") return new Set(["Story", "Task", "Bug"]);
  if (n.includes("story")) return new Set(["Epic"]);
  if (n.includes("task") && !n.includes("sub")) return new Set(["Epic"]);
  if (n.includes("bug")) return new Set(["Epic"]);
  return new Set();
}

/**
 * Uploads attachments to a Jira task sequentially, showing a retry toast on failure.
 * @param verb - "created" or "updated" — used in the failure toast message.
 */
export async function uploadJiraAttachments(
  taskKey: string,
  files: File[],
  verb: "created" | "updated" = "created",
): Promise<void> {
  const attempt = async (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      await apiClient.post(JIRA_API_PATHS.uploadAttachments!(taskKey), formData, {
        timeout: 95_000,
      });
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      const msg = e?.response?.data?.error ?? e?.message ?? "Upload failed.";
      toast.error(`Task ${taskKey} was ${verb}, but attaching "${file.name}" failed. ${msg}`, {
        action: { label: "Retry", onClick: () => void attempt(file) },
      });
    }
  };

  for (const file of files) {
    await attempt(file);
  }
}
