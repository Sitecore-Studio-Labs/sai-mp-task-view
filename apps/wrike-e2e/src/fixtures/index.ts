import { createPlatformE2eFixtures } from "task-e2e";

import { wrikeE2eConfig } from "../config";

/**
 * Playwright fixtures for Wrike E2E.
 * - platformConfig — paths, labels, and cookie name from config
 * - connection — mockConnectionStatus, mockDisconnectApi, setSessionCookie, setSessionCookieByBaseUrl, simulateOAuthConnected, …
 * - taskManagerPage — navigates to the task manager route
 */
export const { test, expect } = createPlatformE2eFixtures(wrikeE2eConfig);
