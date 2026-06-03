// @generated — do not edit. Re-generate with: npx nx run jira:generate-mappings
// Source: capabilities/jira.api.yaml → entities.tasks
import type { PlatformTask } from "@mp/task-core";

import type { JiraIssue } from "@/types/jira";

import { normalizeComment } from "./comments.mapping";

export function normalizeTask(raw: JiraIssue): PlatformTask {
  return {
    id: raw.id,
    key: raw.key,
    fields: {
      summary: raw.fields.summary,
      status: raw.fields.status,
      project: raw.fields.project ?? undefined,
      parent: raw.fields.parent ?? undefined,
      issuetype: raw.fields.issuetype,
      priority: raw.fields.priority ?? undefined,
      assignee: raw.fields.assignee ?? undefined,
      reporter: raw.fields.reporter ?? undefined,
      description: raw.fields.description ?? undefined,
      duedate: raw.fields.duedate ?? undefined,
      subtasks: raw.fields.subtasks?.map(normalizeTask),
      comment: raw.fields.comment
        ? { comments: raw.fields.comment.comments.map(normalizeComment) }
        : undefined,
      attachment: raw.fields.attachment ?? undefined,
    },
  };
}
