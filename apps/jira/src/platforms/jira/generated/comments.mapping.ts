// @generated — do not edit. Re-generate with: npx nx run jira:generate-mappings
// Source: capabilities/jira.api.yaml → entities.comments
import type { PlatformComment } from "@mp/task-core";

import type { JiraComment } from "@/types/jira";

export function normalizeComment(raw: JiraComment): PlatformComment {
  return {
    id: raw.id,
    author: raw.author,
    body: raw.body,
    created: raw.created,
    updated: raw.updated,
    parentCommentId: raw.parentId != null ? String(raw.parentId) : undefined,
  };
}
