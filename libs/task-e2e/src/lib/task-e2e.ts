import type { Page } from "@playwright/test";

import type { PlatformE2eConfig } from "./config/platform-e2e-config";
import type { PlatformConnectionHelpers } from "./fixtures/platform-connection-helpers";

export interface PlatformE2eScenarioContext {
  page: Page;
  platformConfig: PlatformE2eConfig;
  connection: PlatformConnectionHelpers;
}

export interface TaskAppTestingSuite {
  connectPlatform(ctx: PlatformE2eScenarioContext): Promise<void>;
  disconnectPlatform(ctx: PlatformE2eScenarioContext): Promise<void>;
  createTask(ctx: PlatformE2eScenarioContext): Promise<void>;
  deleteTask(ctx: PlatformE2eScenarioContext): Promise<void>;
  editTask(ctx: PlatformE2eScenarioContext): Promise<void>;
  listTasks(ctx: PlatformE2eScenarioContext): Promise<void>;
  viewTask(ctx: PlatformE2eScenarioContext): Promise<void>;
}
