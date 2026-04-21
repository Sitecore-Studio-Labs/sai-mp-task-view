import type { PlatformKind } from "./schema";

/**
 * Phase 6.5 — single source for generated `PlatformCapabilities.capabilities`
 * (mirrors built-in registry presets; `custom` uses a conservative default).
 */
const ASANA_LIKE: Record<string, boolean> = {
  "tasks.read": true,
  "tasks.write": true,
  "tasks.status": false,
  "tasks.assign": true,
  "tasks.comments": true,
  "tasks.attachments": false,
  "projects.read": true,
  "projects.write": true,
  "users.read": true,
};

const TRELLO_LIKE: Record<string, boolean> = {
  "tasks.read": true,
  "tasks.write": true,
  "tasks.status": false,
  "tasks.assign": false,
  "tasks.comments": true,
  "tasks.attachments": false,
  "projects.read": true,
  "projects.write": false,
  "users.read": false,
};

const WRIKE_LIKE: Record<string, boolean> = {
  ...ASANA_LIKE,
};

const CUSTOM_DEFAULT: Record<string, boolean> = {
  ...ASANA_LIKE,
};

export function getGeneratedCapabilityFlags(kind: PlatformKind): Record<string, boolean> {
  switch (kind) {
    case "asana":
      return { ...ASANA_LIKE };
    case "trello":
      return { ...TRELLO_LIKE };
    case "wrike":
      return { ...WRIKE_LIKE };
    case "custom":
      return { ...CUSTOM_DEFAULT };
  }
}
