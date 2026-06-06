import { type BrowserContext, expect, type Page } from "@playwright/test";

import type { PlatformE2eConfig } from "../config/platform-e2e-config";
import { APP_READY_TIMEOUT } from "../constants/timeouts";

function resolveStatusRoutePattern(config: PlatformE2eConfig): string {
  if (!config.connectionStatusApiPath) {
    throw new Error("PlatformE2eConfig.connectionStatusApiPath is required for connection mocks");
  }
  return `**${config.connectionStatusApiPath}`;
}

function resolveSetupRoutePattern(config: PlatformE2eConfig): string {
  if (!config.setupApiPath) {
    throw new Error("PlatformE2eConfig.setupApiPath is required for setup mocks");
  }
  return `**${config.setupApiPath}`;
}

function resolveDisconnectRoutePattern(config: PlatformE2eConfig): string {
  if (!config.disconnectApiPath) {
    throw new Error("PlatformE2eConfig.disconnectApiPath is required for disconnect mocks");
  }
  return `**${config.disconnectApiPath}`;
}

function requireSessionCookieName(config: PlatformE2eConfig): string {
  if (!config.sessionCookieName) {
    throw new Error("PlatformE2eConfig.sessionCookieName is required for session cookie helpers");
  }
  return config.sessionCookieName;
}

/** Prevent OAuth connect from opening a real browser popup during E2E. */
export async function blockOAuthPopups(page: Page): Promise<void> {
  await page.addInitScript(() => {
    window.open = () => ({ closed: false }) as Window;
  });
}

/**
 * Stub connection status from the session cookie presence (dynamic connect/disconnect).
 */
export async function mockConnectionStatusFromSessionCookie(
  page: Page,
  context: BrowserContext,
  config: PlatformE2eConfig,
): Promise<void> {
  const pattern = resolveStatusRoutePattern(config);
  const cookieName = requireSessionCookieName(config);

  await page.unroute(pattern).catch(() => undefined);
  await page.route(pattern, async (route) => {
    const cookies = await context.cookies();
    const connected = cookies.some((cookie) => cookie.name === cookieName);
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ connected }),
    });
  });
}

/** Stub disconnect API and clear session cookies when disconnect is called. */
export async function mockDisconnectApi(
  page: Page,
  context: BrowserContext,
  config: PlatformE2eConfig,
): Promise<void> {
  const pattern = resolveDisconnectRoutePattern(config);

  await page.unroute(pattern).catch(() => undefined);
  await page.route(pattern, async (route) => {
    await context.clearCookies();
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ success: true }),
    });
  });
}

export async function waitForDisconnectResponse(
  page: Page,
  config: PlatformE2eConfig,
): Promise<void> {
  if (!config.disconnectApiPath) {
    throw new Error("PlatformE2eConfig.disconnectApiPath is required to wait for disconnect");
  }

  await page.waitForResponse(
    (response) =>
      response.url().includes(config.disconnectApiPath!) &&
      response.request().method() === "POST" &&
      response.ok(),
    { timeout: APP_READY_TIMEOUT },
  );
}

/** Stub the connection status API (e.g. /api/auth/{platform}/status). */
export async function mockConnectionStatus(
  page: Page,
  config: PlatformE2eConfig,
  connected: boolean,
): Promise<void> {
  const pattern = resolveStatusRoutePattern(config);
  await page.unroute(pattern).catch(() => undefined);
  await page.route(pattern, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ connected }),
    });
  });
}

/** Stub setup as complete so the connected app shell renders after OAuth. */
export async function mockSetupComplete(page: Page, config: PlatformE2eConfig): Promise<void> {
  const pattern = resolveSetupRoutePattern(config);
  await page.unroute(pattern).catch(() => undefined);
  await page.route(pattern, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        connected: true,
        setup: { setupCompletedAt: new Date().toISOString() },
        mappings: [],
      }),
    });
  });
}

/** Simulate a successful OAuth popup callback via postMessage (no external IdP). */
export async function simulateOAuthConnected(page: Page, config: PlatformE2eConfig): Promise<void> {
  if (!config.oauthMessagePlatform) {
    throw new Error("PlatformE2eConfig.oauthMessagePlatform is required for OAuth simulation");
  }

  const platform = config.oauthMessagePlatform;
  await page.evaluate((messagePlatform) => {
    window.postMessage(
      { type: "OAUTH_CONNECTED", platform: messagePlatform },
      window.location.origin,
    );
  }, platform);
}

/** Set the session cookie on the current page origin. */
export async function setSessionCookie(
  context: BrowserContext,
  page: Page,
  config: PlatformE2eConfig,
  value: string,
): Promise<void> {
  if (!config.sessionCookieName) {
    throw new Error("PlatformE2eConfig.sessionCookieName is required to set session cookies");
  }

  const hostname = new URL(page.url()).hostname;
  await context.addCookies([
    {
      name: config.sessionCookieName,
      value,
      domain: hostname,
      path: "/",
    },
  ]);
}

/** Set the session cookie before the first navigation (avoids hostname races). */
export async function setSessionCookieByBaseUrl(
  context: BrowserContext,
  config: PlatformE2eConfig,
  value: string,
  baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3000",
): Promise<void> {
  if (!config.sessionCookieName) {
    throw new Error("PlatformE2eConfig.sessionCookieName is required to set session cookies");
  }

  await context.addCookies([
    {
      name: config.sessionCookieName,
      value,
      url: baseUrl,
    },
  ]);
}

export async function assertSessionCookie(
  context: BrowserContext,
  config: PlatformE2eConfig,
  expectedValue: string,
): Promise<void> {
  const cookieName = requireSessionCookieName(config);
  const cookies = await context.cookies();
  const sessionCookie = cookies.find((cookie) => cookie.name === cookieName);
  expect(sessionCookie).toBeDefined();
  expect(sessionCookie?.value).toBe(expectedValue);
}

export async function assertSessionCookieAbsent(
  context: BrowserContext,
  config: PlatformE2eConfig,
): Promise<void> {
  const cookieName = requireSessionCookieName(config);
  const cookies = await context.cookies();
  const sessionCookie = cookies.find((cookie) => cookie.name === cookieName);
  expect(sessionCookie).toBeUndefined();
}

export async function assertConnectedLabel(page: Page, config: PlatformE2eConfig): Promise<void> {
  if (!config.platformDisplayName) {
    throw new Error("PlatformE2eConfig.platformDisplayName is required for connected assertions");
  }

  await expect(page.getByText(`Connected to ${config.platformDisplayName}`)).toBeVisible({
    timeout: APP_READY_TIMEOUT,
  });
}

export async function assertNotConnectedLabel(
  page: Page,
  config: PlatformE2eConfig,
): Promise<void> {
  if (!config.platformDisplayName) {
    return;
  }

  await expect(page.getByText(`Connected to ${config.platformDisplayName}`)).not.toBeVisible();
}
