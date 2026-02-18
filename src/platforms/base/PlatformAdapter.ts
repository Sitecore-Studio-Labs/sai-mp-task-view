import type { JiraProject, JiraIssue, UpdateJiraTaskPayload } from "@/types/jira";
import type { PlatformToken } from "@/types/platform";

export interface PlatformAdapter {
  authenticate(authCode: string, redirectUri: string): Promise<PlatformToken>;
  getProjects(token: PlatformToken): Promise<JiraProject[]>;
  refreshToken(token: PlatformToken): Promise<PlatformToken>;
  updateTask(
    token: PlatformToken,
    issueIdOrKey: string,
    payload: UpdateJiraTaskPayload,
  ): Promise<JiraIssue>;
}
