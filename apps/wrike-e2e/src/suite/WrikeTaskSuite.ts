import type { PlatformE2eScenarioContext, TaskAppTestingSuite } from "task-e2e";

import { connectPlatform as runConnectPlatform } from "../scenarios/connect-platform";
import { createTask as runCreateTask } from "../scenarios/create-task";
import { deleteTask as runDeleteTask } from "../scenarios/delete-task";
import { disconnectPlatform as runDisconnectPlatform } from "../scenarios/disconnect-platform";
import { editTask as runEditTask } from "../scenarios/edit-task";
import { listTasks as runListTasks } from "../scenarios/list-tasks";
import { viewTask as runViewTask } from "../scenarios/view-task";

export class WrikeTaskSuite implements TaskAppTestingSuite {
  async connectPlatform(ctx: PlatformE2eScenarioContext): Promise<void> {
    await runConnectPlatform(ctx);
  }

  async disconnectPlatform(ctx: PlatformE2eScenarioContext): Promise<void> {
    await runDisconnectPlatform(ctx);
  }

  async createTask(ctx: PlatformE2eScenarioContext): Promise<void> {
    await runCreateTask(ctx);
  }

  async deleteTask(ctx: PlatformE2eScenarioContext): Promise<void> {
    await runDeleteTask(ctx);
  }

  async editTask(ctx: PlatformE2eScenarioContext): Promise<void> {
    await runEditTask(ctx);
  }

  async listTasks(ctx: PlatformE2eScenarioContext): Promise<void> {
    await runListTasks(ctx);
  }

  async viewTask(ctx: PlatformE2eScenarioContext): Promise<void> {
    await runViewTask(ctx);
  }
}
