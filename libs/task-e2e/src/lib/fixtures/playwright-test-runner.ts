import { test as baseTest } from "@playwright/test";

/** Playwright test runner (base or fixture-extended). */
export type PlaywrightTestRunner = typeof baseTest;
