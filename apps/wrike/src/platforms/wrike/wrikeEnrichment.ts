import type {
  PlatformProjectStatuses,
  PlatformStatus,
  PlatformToken,
  PlatformTransition,
} from "@mp/task-core";

import {
  filterPhysicalFolderIds,
  isWrikeLogicalFolderError,
  isWrikeLogicalFolderId,
} from "@/platforms/wrike/wrikeFolderUtils";
import type { WrikeHttpAdapter } from "@/platforms/wrike/WrikeHttpAdapter";
import {
  wrikeStandardNameToCategory,
  wrikeStatusColorToColorName,
} from "@/platforms/wrike/wrikeStatusColors";
import type {
  WrikeContact,
  WrikeCustomStatus,
  WrikeFolder,
  WrikeTask,
  WrikeTaskStatus,
  WrikeWorkflow,
} from "@/types/wrike";

const WRIKE_TASK_STATUS_LABELS: Record<WrikeTaskStatus, string> = {
  Active: "Active",
  Completed: "Completed",
  Deferred: "Deferred",
  Cancelled: "Cancelled",
};

export function customStatusToPlatformStatus(status: WrikeCustomStatus): PlatformStatus {
  const category = wrikeStandardNameToCategory(status.standardName);
  const colorName = wrikeStatusColorToColorName(status.color);

  return {
    id: status.id,
    name: status.name,
    statusCategory: {
      ...category,
      ...(colorName && { colorName }),
    },
  };
}

export function flattenCustomStatuses(workflows: WrikeWorkflow[]): WrikeCustomStatus[] {
  return workflows.flatMap((workflow) => workflow.customStatuses ?? []);
}

export function mergeCustomStatusesIntoMap(
  statusMap: Map<string, WrikeCustomStatus>,
  workflows: WrikeWorkflow[],
): void {
  for (const status of flattenCustomStatuses(workflows)) {
    statusMap.set(status.id, status);
  }
}

export function platformStatusFromWrikeTaskStatus(
  status: WrikeTaskStatus,
  customStatusId?: string,
): PlatformStatus {
  const standardName = status as WrikeCustomStatus["standardName"];
  return {
    id: customStatusId ?? status,
    name: WRIKE_TASK_STATUS_LABELS[status],
    statusCategory: wrikeStandardNameToCategory(standardName),
  };
}

/** Resolves task status from workflow map, with built-in Wrike status as fallback. */
export function resolveTaskPlatformStatus(
  raw: WrikeTask,
  statusMap: Map<string, WrikeCustomStatus>,
): PlatformStatus {
  const customStatus = raw.customStatusId ? statusMap.get(raw.customStatusId) : undefined;
  if (customStatus) return customStatusToPlatformStatus(customStatus);

  if (raw.status) {
    return platformStatusFromWrikeTaskStatus(raw.status, raw.customStatusId);
  }

  return {
    id: raw.customStatusId ?? "unknown",
    name: "Unknown",
    statusCategory: { key: "undefined", name: "Unknown" },
  };
}

async function resolveSpaceIdForFolder(
  adapter: WrikeHttpAdapter,
  token: PlatformToken,
  folderId: string,
): Promise<string | null> {
  if (isWrikeLogicalFolderId(folderId)) return null;

  const visited = new Set<string>();
  const queue = [folderId];

  while (queue.length > 0 && visited.size < 16) {
    const currentId = queue.shift();
    if (!currentId || visited.has(currentId) || isWrikeLogicalFolderId(currentId)) continue;
    visited.add(currentId);

    try {
      const folder: WrikeFolder = await adapter.getFolder(token, currentId);
      if (folder.space) return folder.id;

      for (const parentId of folder.superParentIds ?? []) {
        if (!visited.has(parentId) && !isWrikeLogicalFolderId(parentId)) queue.push(parentId);
      }
    } catch (error) {
      if (isWrikeLogicalFolderError(error)) continue;
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status === 404) continue;
      console.error(`[wrikeEnrichment] Failed to load folder ${currentId}:`, error);
    }
  }

  return null;
}

/**
 * Resolves folder ids for workflow/status lookup.
 * Subtasks often list a parent task id and/or the virtual root folder in parentIds —
 * walk superTaskIds when no physical folder is present.
 */
export async function resolveWorkflowFolderIds(
  adapter: WrikeHttpAdapter,
  token: PlatformToken,
  task: WrikeTask,
  visitedTaskIds = new Set<string>(),
): Promise<string[]> {
  const folderIds = new Set(filterPhysicalFolderIds(task.parentIds));

  if (folderIds.size === 0 && task.superTaskIds?.length) {
    for (const superTaskId of task.superTaskIds) {
      if (visitedTaskIds.has(superTaskId)) continue;
      visitedTaskIds.add(superTaskId);

      const superTasks = await adapter.getTasksByIds(token, [superTaskId]);
      for (const superTask of superTasks) {
        for (const id of await resolveWorkflowFolderIds(
          adapter,
          token,
          superTask,
          visitedTaskIds,
        )) {
          folderIds.add(id);
        }
      }
    }
  }

  return [...folderIds];
}

async function loadAllSpaceWorkflows(
  adapter: WrikeHttpAdapter,
  token: PlatformToken,
): Promise<WrikeWorkflow[]> {
  try {
    const spaces = await adapter.getSpaces(token);
    const workflows: WrikeWorkflow[] = [];
    for (const space of spaces) {
      try {
        workflows.push(...(await adapter.getSpaceWorkflows(token, space.id)));
      } catch (error) {
        console.error(`[wrikeEnrichment] Failed to load workflows for space ${space.id}:`, error);
      }
    }
    return workflows;
  } catch (error) {
    console.error("[wrikeEnrichment] Failed to list Wrike spaces:", error);
    return [];
  }
}

function mergeWorkflowsById(workflows: WrikeWorkflow[]): WrikeWorkflow[] {
  const byId = new Map<string, WrikeWorkflow>();
  for (const workflow of workflows) {
    byId.set(workflow.id, workflow);
  }
  return [...byId.values()];
}

/** Loads account + space-scoped workflows for one or more folder ids. */
export async function loadWorkflowsForContext(
  adapter: WrikeHttpAdapter,
  token: PlatformToken,
  folderIds: string[],
): Promise<WrikeWorkflow[]> {
  const accountWorkflows = await adapter.getWorkflows(token);
  let merged = mergeWorkflowsById(accountWorkflows);

  const resolvedSpaceIds = new Set<string>();
  for (const folderId of folderIds) {
    try {
      const spaceId = await resolveSpaceIdForFolder(adapter, token, folderId);
      if (spaceId) resolvedSpaceIds.add(spaceId);
    } catch (error) {
      console.error(`[wrikeEnrichment] Failed to resolve space for folder ${folderId}:`, error);
    }
  }

  for (const spaceId of resolvedSpaceIds) {
    try {
      merged = mergeWorkflowsById([
        ...merged,
        ...(await adapter.getSpaceWorkflows(token, spaceId)),
      ]);
    } catch (error) {
      console.error(`[wrikeEnrichment] Failed to load space workflows for ${spaceId}:`, error);
    }
  }

  if (flattenCustomStatuses(merged).length === 0) {
    merged = mergeWorkflowsById([...merged, ...(await loadAllSpaceWorkflows(adapter, token))]);
  }

  return merged;
}

export async function loadWorkflowsForFolder(
  adapter: WrikeHttpAdapter,
  token: PlatformToken,
  folderId?: string,
): Promise<WrikeWorkflow[]> {
  return loadWorkflowsForContext(adapter, token, folderId ? [folderId] : []);
}

export async function loadWorkflowsForTask(
  adapter: WrikeHttpAdapter,
  token: PlatformToken,
  task: WrikeTask,
): Promise<WrikeWorkflow[]> {
  const folderIds = await resolveWorkflowFolderIds(adapter, token, task);
  return loadWorkflowsForContext(adapter, token, folderIds);
}

/** Prefer the workflow that contains the task's current custom status. */
export function pickWorkflowsForTask(
  workflows: WrikeWorkflow[],
  customStatusId?: string,
): WrikeWorkflow[] {
  if (!customStatusId) return workflows;
  const matching = workflows.filter((workflow) =>
    workflow.customStatuses?.some((status) => status.id === customStatusId),
  );
  return matching.length > 0 ? matching : workflows;
}

export async function buildEnrichmentContext(
  adapter: WrikeHttpAdapter,
  token: PlatformToken,
  folderId?: string,
): Promise<{
  statusMap: Map<string, WrikeCustomStatus>;
  contactMap: Map<string, WrikeContact>;
}> {
  const statusMap = new Map<string, WrikeCustomStatus>();
  let contactMap = new Map<string, WrikeContact>();

  try {
    const workflows = await loadWorkflowsForFolder(adapter, token, folderId);
    mergeCustomStatusesIntoMap(statusMap, workflows);
  } catch (error) {
    console.error("[wrikeEnrichment] Failed to load workflows for status map:", error);
  }

  try {
    const contacts = await adapter.getContacts(token);
    contactMap = new Map<string, WrikeContact>(contacts.map((c) => [c.id, c]));
  } catch (error) {
    console.error("[wrikeEnrichment] Failed to load contacts:", error);
  }

  return { statusMap, contactMap };
}

export function workflowsToProjectStatuses(workflows: WrikeWorkflow[]): PlatformProjectStatuses[] {
  return workflows
    .map((w) => ({
      id: w.id,
      name: w.name,
      statuses: dedupeCustomStatuses(w.customStatuses ?? []).map(customStatusToPlatformStatus),
    }))
    .filter((workflow) => workflow.statuses.length > 0);
}

export function workflowsToTransitions(workflows: WrikeWorkflow[]): PlatformTransition[] {
  const seen = new Set<string>();
  const transitions: PlatformTransition[] = [];

  for (const status of dedupeCustomStatuses(flattenCustomStatuses(workflows))) {
    if (status.hidden) continue;
    if (seen.has(status.id)) continue;
    seen.add(status.id);
    transitions.push({
      id: status.id,
      name: status.name,
      to: customStatusToPlatformStatus(status),
    });
  }

  return transitions;
}

function dedupeCustomStatuses(statuses: WrikeCustomStatus[]): WrikeCustomStatus[] {
  const byId = new Map<string, WrikeCustomStatus>();
  for (const status of statuses) {
    byId.set(status.id, status);
  }
  return [...byId.values()];
}

export function contactToPlatformUser(contact: WrikeContact) {
  return {
    accountId: contact.id,
    displayName: `${contact.firstName} ${contact.lastName}`.trim(),
    avatarUrls: contact.avatarUrl ? { "48x48": contact.avatarUrl } : undefined,
  };
}
