import type { PlatformE2eScenarioContext } from "task-e2e";
import { bindPlatformConnectionHelpers, clickConnectAccount } from "task-e2e";

/**
 * Complete OAuth for Jira using connection helpers (API mocks + postMessage).
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
