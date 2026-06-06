import {
  bindPlatformConnectionHelpers,
  clickConnectAccount,
  type PlatformE2eScenarioContext,
} from "task-e2e";

/**
 * Complete OAuth using connection helpers (API mocks + postMessage, no external IdP).
 */
export async function completePlatformOAuth({
  page,
  platformConfig,
}: Pick<PlatformE2eScenarioContext, "page" | "platformConfig">): Promise<void> {
  const connection = bindPlatformConnectionHelpers(page, page.context(), platformConfig);
  await connection.mockConnectionStatus(true);
  if (platformConfig.setupApiPath) {
    await connection.mockSetupComplete();
  }
  await clickConnectAccount(page, platformConfig);
  await connection.simulateOAuthConnected();
}
