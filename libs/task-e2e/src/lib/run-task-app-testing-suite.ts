import { test as baseTest } from "@playwright/test";

import type { PlaywrightTestRunner } from "./fixtures/playwright-test-runner";
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
 *   import { test } from "./fixtures";
 *   runTaskAppTestingSuite(new MyPlatformTaskSuite(), test);
 */
export function runTaskAppTestingSuite(
  suite: TaskAppTestingSuite,
  test: PlaywrightTestRunner = baseTest,
): void {
  test.describe("Task app testing suite", () => {
    for (const method of SUITE_METHODS) {
      test(method, async ({ page }) => {
        await suite[method](page);
      });
    }
  });
}
