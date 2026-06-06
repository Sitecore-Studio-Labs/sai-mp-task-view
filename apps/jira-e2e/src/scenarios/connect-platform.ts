import {
  assertConnectedLabel,
  assertDisconnected,
  assertNotConnectedLabel,
  clickConnectAccount,
  gotoTaskManager,
  type PlatformE2eScenarioContext,
} from "task-e2e";

const E2E_SESSION_TOKEN = "e2e-jira-session-token";

/** E2E scenario: connect via simulated OAuth (connection fixtures + API mocks + postMessage). */
export async function connectPlatform({
  page,
  platformConfig,
  connection,
}: PlatformE2eScenarioContext): Promise<void> {
  await connection.mockConnectionStatus(false);
  await gotoTaskManager(page, platformConfig);
  await assertDisconnected(page, platformConfig);
  await assertNotConnectedLabel(page, platformConfig);

  await connection.mockConnectionStatus(true);
  await connection.mockSetupComplete();
  await clickConnectAccount(page, platformConfig);
  await connection.simulateOAuthConnected();
  await connection.setSessionCookie(E2E_SESSION_TOKEN);

  await connection.assertSessionCookie(E2E_SESSION_TOKEN);
  await assertConnectedLabel(page, platformConfig);
}
