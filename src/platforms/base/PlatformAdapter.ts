import type {
  JiraProject,
  JiraIssueType,
  JiraTask,
  CreateJiraTaskPayload,
  JiraPriority,
  JiraUser,
} from "@/types/jira";
import type { PlatformToken } from "@/types/platform";

export interface PlatformAdapter {
  authenticate(authCode: string, redirectUri: string): Promise<PlatformToken>;
  getProjects(token: PlatformToken): Promise<JiraProject[]>;
  refreshToken(token: PlatformToken): Promise<PlatformToken>;
  getIssueTypes(token: PlatformToken, projectIdOrKey: string): Promise<JiraIssueType[]>;
  getPriorities(token: PlatformToken): Promise<JiraPriority[]>;
  searchAssignees(token: PlatformToken, params: { projectIdOrKey: string; query?: string }): Promise<JiraUser[]>;
  createTask(token: PlatformToken, payload: CreateJiraTaskPayload): Promise<JiraTask>;
}
