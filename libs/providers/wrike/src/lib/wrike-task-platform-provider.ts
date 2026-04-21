import type { JiraBffTransportOptions } from "@sai-mp-jira-task-view/jira-providers";
import type {
  GetTasksOptions,
  PlatformProject,
  PlatformTask,
  TaskPlatformProvider,
} from "@sai-mp-jira-task-view/platform";

/**
 * Generated stub for "wrike" (Phase 6.2 platform-app).
 * Replace with real BFF integration; keep {@link TaskPlatformProvider} contract.
 */
export class WrikeTaskPlatformProvider implements TaskPlatformProvider {
  constructor(_options?: JiraBffTransportOptions) {}

  async getProjects(): Promise<PlatformProject[]> {
    return [];
  }

  async getTasks(_projectKey: string, _options?: GetTasksOptions): Promise<PlatformTask[]> {
    return [];
  }
}
