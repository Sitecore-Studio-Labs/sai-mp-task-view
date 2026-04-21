export type CapabilityKey =
  | "tasks.read"
  | "tasks.write"
  | "tasks.status"
  | "tasks.assign"
  | "tasks.comments"
  | "tasks.attachments"
  | "projects.read"
  | "projects.write"
  | "users.read";

export interface PlatformCapabilities {
  platform: string;
  version: string;
  capabilities: Record<CapabilityKey, boolean>;
}
