import type { JiraProject } from "@/types/jira";
import type { PlatformToken } from "@/types/platform";

/**
 * Base interface for platform adapters in this initial setup.
 * Only connectivity and project listing are required; extend when adding task CRUD later.
 */
export interface PlatformAdapter {
  authenticate(authCode: string, redirectUri: string): Promise<PlatformToken>;
  getProjects(token: PlatformToken): Promise<JiraProject[]>;
  refreshToken(token: PlatformToken): Promise<PlatformToken>;
}
