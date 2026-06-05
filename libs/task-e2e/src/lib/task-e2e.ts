import type { Page } from "@playwright/test";

export interface TaskAppTestingSuite {
  connectPlatform(page: Page): Promise<void>;
  disconnectPlatform(page: Page): Promise<void>;
  createTask(page: Page): Promise<void>;
  deleteTask(page: Page): Promise<void>;
  editTask(page: Page): Promise<void>;
  listTasks(page: Page): Promise<void>;
  viewTask(page: Page): Promise<void>;
}
