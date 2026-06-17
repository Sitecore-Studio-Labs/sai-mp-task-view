import type { PlatformE2eScenarioContext } from "task-e2e";
import {
  assertConnectedLabel,
  assertDisconnected,
  assertNotConnectedLabel,
  clickConnectAccount,
  gotoTaskManager,
} from "task-e2e";

const E2E_SESSION_TOKEN = "e2e-jira-session-token";

/** E2E scenario: connect to Jira via simulated OAuth (connection fixtures + API mocks + postMessage). */
export async function connectPlatform({
  page,
  platformConfig,
  connection,
}: PlatformE2eScenarioContext): Promise<void> {
  await connection.blockOAuthPopups();
  await connection.mockConnectionStatus(false);
  await connection.mockSetupComplete();
  await gotoTaskManager(page, platformConfig);
  await assertDisconnected(page, platformConfig);
  await assertNotConnectedLabel(page, platformConfig);

  await connection.mockConnectionStatus(true);
  await clickConnectAccount(page, platformConfig);
  const statusRefresh = connection.beginWaitingForConnectionStatusRefresh();
  await connection.simulateOAuthConnected();
  await connection.setSessionCookie(E2E_SESSION_TOKEN);
  await statusRefresh;

  await connection.assertSessionCookie(E2E_SESSION_TOKEN);
  await assertConnectedLabel(page, platformConfig);
}
