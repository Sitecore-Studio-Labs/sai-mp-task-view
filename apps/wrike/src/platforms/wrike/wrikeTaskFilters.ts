import type { PlatformTask, TaskFilters } from "@mp/task-core";

const UNASSIGNED_ASSIGNEE = "unassigned";

/** Maps UI TaskFilters to Wrike GET /folders/{id}/tasks query params. */
export function toWrikeTaskQueryParams(filters?: Partial<TaskFilters>): Record<string, unknown> {
  if (!filters) return {};

  const params: Record<string, unknown> = {};

  if (filters.status?.length) {
    params.customStatuses = JSON.stringify(filters.status);
  }

  const assigneeIds = filters.assignee?.filter((id) => id !== UNASSIGNED_ASSIGNEE) ?? [];
  if (assigneeIds.length) {
    params.responsibles = JSON.stringify(assigneeIds);
  }

  if (filters.priority?.length === 1) {
    params.importance = filters.priority[0];
  }

  return params;
}

/** Applies filters that cannot be expressed fully on the Wrike tasks endpoint. */
export function applyWrikeClientTaskFilters(
  tasks: PlatformTask[],
  filters?: Partial<TaskFilters>,
): PlatformTask[] {
  if (!filters) return tasks;

  let result = tasks;

  if (filters.assignee?.includes(UNASSIGNED_ASSIGNEE)) {
    result = result.filter((task) => !task.fields.assignee?.accountId);
  }

  if (filters.status?.length) {
    const allowedStatuses = new Set(filters.status);
    result = result.filter((task) => {
      const statusId = task.fields.status.id;
      return statusId != null && allowedStatuses.has(statusId);
    });
  }

  if (filters.priority && filters.priority.length > 1) {
    const allowed = new Set(filters.priority);
    result = result.filter((task) => {
      const id = task.fields.priority?.id;
      return id != null && allowed.has(id);
    });
  }

  return result;
}
