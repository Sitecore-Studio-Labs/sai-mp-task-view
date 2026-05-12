// @generated — do not edit. Re-generate with: npx nx run jira:generate-mappings
// Source: capabilities/jira.api.yaml → entities.projects
import type { PlatformProject } from "@mp/task-core";

import type { JiraProject } from "@/types/jira";

export function normalizeProject(raw: JiraProject): PlatformProject {
  return {
    id: raw.id,
    key: raw.key,
    name: raw.name,
  };
}
