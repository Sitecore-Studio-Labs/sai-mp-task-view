import { PlatformCapabilities } from "./capability-types";

export const CAPABILITY_REGISTRY: Record<string, PlatformCapabilities> = {
  jira: {
    platform: "jira",
    version: "1.0",
    capabilities: {
      "tasks.read": true,
      "tasks.write": true,
      "tasks.status": true,
      "tasks.assign": true,
      "tasks.comments": true,
      "tasks.attachments": true,
      "projects.read": true,
      "projects.write": true,
      "users.read": true,
    },
  },

  asana: {
    platform: "asana",
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
  },

  trello: {
    platform: "trello",
    version: "1.0",
    capabilities: {
      "tasks.read": true,
      "tasks.write": true,
      "tasks.status": false,
      "tasks.assign": false,
      "tasks.comments": true,
      "tasks.attachments": false,
      "projects.read": true,
      "projects.write": false,
      "users.read": false,
    },
  },
};
