import type { WorkItem, WorkItemType } from "@mp/ai";

import type { CreateJiraTaskPayload, JiraIssueType } from "@/types/jira";

/** Flatten tree to creation order: parent before its children (depth-first). */
export function flattenToCreationOrder(items: WorkItem[]): WorkItem[] {
  const out: WorkItem[] = [];
  function visit(item: WorkItem) {
    out.push(item);
    item.children.forEach(visit);
  }
  items.forEach(visit);
  return out;
}

/** Map internal type to Jira issue type name (defaults). */
const INTERNAL_TYPE_TO_JIRA_NAME: Record<WorkItemType, string> = {
  epic: "Epic",
  story: "Story",
  task: "Task",
  subtask: "Sub-task",
};

/** Build a map from internal WorkItemType to Jira issue type id using project issue types. */
export function buildIssueTypeIdMap(issueTypes: JiraIssueType[]): Record<WorkItemType, string> {
  const byName = new Map<string, string>(
    issueTypes.map((it) => [it.name.trim().toLowerCase(), it.id]),
  );
  const map = {} as Record<WorkItemType, string>;
  for (const [internal, jiraName] of Object.entries(INTERNAL_TYPE_TO_JIRA_NAME)) {
    const id = byName.get(jiraName.toLowerCase()) ?? byName.get(internal);
    if (id) map[internal as WorkItemType] = id;
  }
  return map;
}

export interface MapToJiraContext {
  projectId: string;
  parentKey?: string;
  issueTypeIdByInternalType: Record<WorkItemType, string>;
}

/**
 * Map a single internal WorkItem to Jira create payload.
 * Used by publish orchestration; parentKey is set from previously created parent.
 */
export function mapWorkItemToJiraPayload(
  item: WorkItem,
  ctx: MapToJiraContext,
): CreateJiraTaskPayload {
  const issueTypeId = ctx.issueTypeIdByInternalType[item.type];
  if (!issueTypeId) {
    throw new Error(
      `No Jira issue type mapped for internal type "${item.type}". Ensure project has Epic, Story, Task, Sub-task.`,
    );
  }
  const priority =
    item.metadata?.priority && String(item.metadata.priority).trim()
      ? String(item.metadata.priority).trim()
      : undefined;
  const assignee =
    item.metadata?.assigneeHint && String(item.metadata.assigneeHint).trim()
      ? String(item.metadata.assigneeHint).trim()
      : undefined;

  // Jira only accepts the "parent" field when creating a Sub-task. Sending parent for
  // Epic/Story/Task causes "Given parent work item does not belong to appropriate hierarchy".
  // Sub-tasks require parent or Jira returns "parent issue key or id not specified".
  const payload: CreateJiraTaskPayload = {
    projectId: ctx.projectId,
    issueTypeId,
    summary: item.title.trim() || "Untitled",
    description: item.description?.trim() || undefined,
    ...(priority && { priority }),
    ...(assignee && { assignee }),
    ...(item.type === "subtask" && ctx.parentKey && { parentIssueKey: ctx.parentKey }),
  };
  return payload;
}
