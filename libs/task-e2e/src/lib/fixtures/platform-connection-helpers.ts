import type { BrowserContext, Page } from "@playwright/test";

import type { PlatformE2eConfig } from "../config/platform-e2e-config";
import {
  assertSessionCookie,
  assertSessionCookieAbsent,
  blockOAuthPopups,
  mockConnectionStatus,
  mockConnectionStatusFromSessionCookie,
  mockDisconnectApi,
  mockSetupComplete,
  setSessionCookie,
  setSessionCookieByBaseUrl,
  simulateOAuthConnected,
  waitForDisconnectResponse,
} from "../utils/platform-connection-mock";

/** Platform-agnostic connection helpers bound to the current page and browser context. */
export type PlatformConnectionHelpers = {
  blockOAuthPopups: () => Promise<void>;
  mockConnectionStatus: (connected: boolean) => Promise<void>;
  mockConnectionStatusFromSessionCookie: () => Promise<void>;
  mockDisconnectApi: () => Promise<void>;
  mockSetupComplete: () => Promise<void>;
  setSessionCookie: (value: string) => Promise<void>;
  setSessionCookieByBaseUrl: (value: string) => Promise<void>;
  simulateOAuthConnected: () => Promise<void>;
  assertSessionCookie: (expectedValue: string) => Promise<void>;
  assertSessionCookieAbsent: () => Promise<void>;
  waitForDisconnectResponse: () => Promise<void>;
};

export function bindPlatformConnectionHelpers(
  page: Page,
  context: BrowserContext,
  config: PlatformE2eConfig,
): PlatformConnectionHelpers {
  return {
    blockOAuthPopups: () => blockOAuthPopups(page),
    mockConnectionStatus: (connected) => mockConnectionStatus(page, config, connected),
    mockConnectionStatusFromSessionCookie: () =>
      mockConnectionStatusFromSessionCookie(page, context, config),
    mockDisconnectApi: () => mockDisconnectApi(page, context, config),
    mockSetupComplete: () => mockSetupComplete(page, config),
    setSessionCookie: (value) => setSessionCookie(context, page, config, value),
    setSessionCookieByBaseUrl: (value) => setSessionCookieByBaseUrl(context, config, value),
    simulateOAuthConnected: () => simulateOAuthConnected(page, config),
    assertSessionCookie: (expectedValue) => assertSessionCookie(context, config, expectedValue),
    assertSessionCookieAbsent: () => assertSessionCookieAbsent(context, config),
    waitForDisconnectResponse: () => waitForDisconnectResponse(page, config),
  };
}
