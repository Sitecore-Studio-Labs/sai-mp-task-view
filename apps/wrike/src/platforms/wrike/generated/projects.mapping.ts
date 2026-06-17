// @generated — do not edit. Re-generate with: npx nx run wrike:generate-mappings
// Source: capabilities/wrike.api.yaml → entities.projects
import type { PlatformProject } from "@mp/task-core";

import type { WrikeFolder } from "@/types/wrike";

export function normalizeProject(raw: WrikeFolder): PlatformProject {
  return {
    id: raw.id,
    key: raw.id,
    name: raw.title ?? raw.id,
  };
}
