import type { UISchema } from "./ui-schema-types";

const EXTRA_PLATFORM_UI_SCHEMAS: Record<string, UISchema> = {
  // @nx-platform-ui-schema-extensions:entries-start
  wrike: {
    type: "container",
    children: [
      { type: "feature", key: "tasks.status" },
      { type: "feature", key: "tasks.assign" },
    ],
  },
  // @nx-platform-ui-schema-extensions:entries-end
};

export function getExtensionPlatformUISchema(platform: string): UISchema | null {
  return EXTRA_PLATFORM_UI_SCHEMAS[platform] ?? null;
}
