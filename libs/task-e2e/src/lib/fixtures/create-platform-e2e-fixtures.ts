/* eslint-disable react-hooks/rules-of-hooks */
import { expect, type Page, test as baseTest } from "@playwright/test";

import type { PlatformE2eConfig } from "../config/platform-e2e-config";
import { gotoTaskManager } from "../pages/navigation";
import {
  bindPlatformConnectionHelpers,
  type PlatformConnectionHelpers,
} from "./platform-connection-helpers";

export type PlatformE2eFixtures = {
  platformConfig: PlatformE2eConfig;
  taskManagerPage: Page;
  connection: PlatformConnectionHelpers;
};

/**
 * Creates Playwright fixtures for a platform E2E app.
 * Auth-free: no storageState, no pre-connect — safe for all generated scenarios.
 */
export function createPlatformE2eFixtures(config: PlatformE2eConfig) {
  const test = baseTest.extend<PlatformE2eFixtures>({
    platformConfig: async ({}, use) => {
      await use(config);
    },
    connection: async ({ page, context, platformConfig }, use) => {
      await use(bindPlatformConnectionHelpers(page, context, platformConfig));
    },
    taskManagerPage: async ({ page, platformConfig }, use) => {
      await gotoTaskManager(page, platformConfig);
      await use(page);
    },
  });

  return { test, expect };
}
