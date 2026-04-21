import { getExtensionPlatformUISchema } from "./platform-ui-schema.extensions";
import type { UISchema } from "./ui-schema-types";

export function getPlatformUISchema(platform: string): UISchema {
  const fromExtension = getExtensionPlatformUISchema(platform);
  if (fromExtension) {
    return fromExtension;
  }
  switch (platform) {
    case "jira":
      return {
        type: "container",
        children: [
          { type: "feature", key: "tasks.status" },
          { type: "feature", key: "tasks.assign" },
          { type: "feature", key: "tasks.attachments" },
          { type: "feature", key: "tasks.comments" },
        ],
      };

    case "asana":
      return {
        type: "container",
        children: [
          { type: "feature", key: "tasks.status" },
          { type: "feature", key: "tasks.assign" },
        ],
      };

    default:
      return { type: "container", children: [] };
  }
}
