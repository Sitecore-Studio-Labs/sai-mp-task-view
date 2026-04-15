import type { PlatformType } from "@/types/platform-entities";

export class PlatformAuthError extends Error {
  constructor(
    public readonly platform: PlatformType,
    message?: string,
  ) {
    super(
      message ?? `${platform === "jira" ? "Jira" : "Wrike"} session has expired. Please reconnect.`,
    );
    this.name = "PlatformAuthError";
  }
}
