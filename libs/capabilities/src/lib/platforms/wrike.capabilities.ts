import type { PlatformCapabilities } from "../capability-types";

export const WrikeCapabilities: PlatformCapabilities = {
  platform: "wrike",
  version: "1.0",
  capabilities: {
    "tasks.read": true,
    "tasks.write": true,
    "tasks.status": false,
    "tasks.assign": true,
    "tasks.comments": true,
    "tasks.attachments": false,
    "projects.read": true,
    "projects.write": true,
    "users.read": true,
  },
};
