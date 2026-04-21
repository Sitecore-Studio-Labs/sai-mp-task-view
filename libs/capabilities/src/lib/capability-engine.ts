import { CAPABILITY_REGISTRY } from "./capability-registry";

export type UIFeature = "status" | "assign" | "attachments" | "comments" | "projects";

export function resolveCapabilities(platform: string): Record<string, boolean> {
  return CAPABILITY_REGISTRY[platform]?.capabilities ?? {};
}

export function getEnabledFeatures(platform: string): UIFeature[] {
  const caps = resolveCapabilities(platform);

  const features: UIFeature[] = [];

  if (caps["tasks.status"]) features.push("status");
  if (caps["tasks.assign"]) features.push("assign");
  if (caps["tasks.attachments"]) features.push("attachments");
  if (caps["tasks.comments"]) features.push("comments");
  if (caps["projects.read"]) features.push("projects");

  return features;
}
