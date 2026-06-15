import type { CreateTaskPayload, UpdateTaskPayload } from "@mp/task-core";

import type { WrikeApiCreateTaskBody, WrikeApiUpdateTaskBody, WrikeTask } from "@/types/wrike";

const DEFAULT_DATE_TYPE = "Planned";

function toWrikeImportance(
  priority: string | null | undefined,
): "High" | "Normal" | "Low" | undefined {
  if (!priority) return undefined;
  const normalized = priority.trim();
  if (normalized === "High" || normalized === "Normal" || normalized === "Low") {
    return normalized;
  }
  return undefined;
}

function toWrikeDates(dueDate?: string | null, startDate?: string | null) {
  if (!dueDate && !startDate) return undefined;
  return {
    type: DEFAULT_DATE_TYPE,
    ...(dueDate ? { due: dueDate } : {}),
    ...(startDate ? { start: startDate } : {}),
  };
}

export function toWrikeCreateBody(payload: CreateTaskPayload): WrikeApiCreateTaskBody {
  const body: WrikeApiCreateTaskBody = {
    title: payload.summary,
  };
  if (payload.description) body.description = payload.description;
  const importance = toWrikeImportance(payload.priority);
  if (importance) body.importance = importance;
  if (payload.assignee) body.responsibles = [payload.assignee];
  if (payload.parentIssueKey) body.superTasks = [payload.parentIssueKey];
  const dates = toWrikeDates(payload.dueDate);
  if (dates) body.dates = dates;
  return body;
}

export function toWrikeUpdateBody(
  payload: UpdateTaskPayload,
  currentTask?: WrikeTask,
): WrikeApiUpdateTaskBody {
  const body: WrikeApiUpdateTaskBody = {};

  if (payload.summary !== undefined) body.title = payload.summary;
  if (payload.description !== undefined) {
    body.description = payload.description ?? "";
  }
  if (payload.priority !== undefined) {
    const importance = toWrikeImportance(payload.priority ?? undefined);
    if (importance) body.importance = importance;
  }
  if (payload.dueDate !== undefined) {
    body.dates = toWrikeDates(payload.dueDate, currentTask?.dates?.start);
  }
  if (payload.parentIssueKey !== undefined) {
    if (payload.parentIssueKey) {
      body.superTasks = [payload.parentIssueKey];
    }
  }

  if (payload.assignee !== undefined) {
    const currentIds = currentTask?.responsibleIds ?? [];
    const nextId = payload.assignee?.trim() || null;
    if (nextId && !currentIds.includes(nextId)) {
      body.addResponsibles = [nextId];
    }
    if (!nextId && currentIds.length > 0) {
      body.removeResponsibles = [...currentIds];
    } else if (nextId) {
      const toRemove = currentIds.filter((id) => id !== nextId);
      if (toRemove.length > 0) body.removeResponsibles = toRemove;
    }
  }

  return body;
}
