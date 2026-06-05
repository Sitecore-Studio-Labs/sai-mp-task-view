import { test } from "@playwright/test";

import type { TaskAppTestingSuite } from "./task-e2e";

const SUITE_METHODS = [
  "connectPlatform",
  "disconnectPlatform",
  "createTask",
  "deleteTask",
  "editTask",
  "listTasks",
  "viewTask",
] as const satisfies readonly (keyof TaskAppTestingSuite)[];

/**
 * Registers Playwright tests for each {@link TaskAppTestingSuite} scenario.
 *
 * Usage in a generated `*.e2e.ts` entry file:
 *   runTaskAppTestingSuite(new MyPlatformTaskSuite());
 */
export function runTaskAppTestingSuite(suite: TaskAppTestingSuite): void {
  test.describe("Task app testing suite", () => {
    for (const method of SUITE_METHODS) {
      test(method, async ({ page }) => {
        await suite[method](page);
      });
    }
  });
}
