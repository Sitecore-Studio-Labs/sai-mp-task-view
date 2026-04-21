import type { UISchema } from "./ui-schema-types";

export function getPlatformUISchema(platform: string): UISchema {
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
