import { createPlatformE2eFixtures } from "task-e2e";

import { jiraE2eConfig } from "../config";

/**
 * Playwright fixtures for Jira E2E.
 * - platformConfig — paths, labels, and cookie name from config
 * - connection — mockConnectionStatus, mockDisconnectApi, setSessionCookie, setSessionCookieByBaseUrl, simulateOAuthConnected, …
 * - taskManagerPage — navigates to the task manager route
 */
export const { test, expect } = createPlatformE2eFixtures(jiraE2eConfig);
