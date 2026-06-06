import type { BrowserContext, Page } from "@playwright/test";

import type { PlatformE2eConfig } from "../config/platform-e2e-config";
import {
  assertSessionCookie,
  mockConnectionStatus,
  mockSetupComplete,
  setSessionCookie,
  setSessionCookieByBaseUrl,
  simulateOAuthConnected,
} from "../utils/platform-connection-mock";

/** Platform-agnostic connection helpers bound to the current page and browser context. */
export type PlatformConnectionHelpers = {
  mockConnectionStatus: (connected: boolean) => Promise<void>;
  mockSetupComplete: () => Promise<void>;
  setSessionCookie: (value: string) => Promise<void>;
  setSessionCookieByBaseUrl: (value: string) => Promise<void>;
  simulateOAuthConnected: () => Promise<void>;
  assertSessionCookie: (expectedValue: string) => Promise<void>;
};

export function bindPlatformConnectionHelpers(
  page: Page,
  context: BrowserContext,
  config: PlatformE2eConfig,
): PlatformConnectionHelpers {
  return {
    mockConnectionStatus: (connected) => mockConnectionStatus(page, config, connected),
    mockSetupComplete: () => mockSetupComplete(page, config),
    setSessionCookie: (value) => setSessionCookie(context, page, config, value),
    setSessionCookieByBaseUrl: (value) => setSessionCookieByBaseUrl(context, config, value),
    simulateOAuthConnected: () => simulateOAuthConnected(page, config),
    assertSessionCookie: (expectedValue) => assertSessionCookie(context, config, expectedValue),
  };
}
