import type { PlatformE2eScenarioContext } from "task-e2e";
import {
  assertConnectedLabel,
  assertDisconnected,
  beginWaitingForTaskListShellData,
  cancelDisconnect,
  clickConnectAccount,
  confirmDisconnect,
  gotoTaskManager,
  installTaskManagerShellApiMocks,
  openDisconnectConfirm,
  openSettingsPanel,
  TASK_LIST_E2E_PROJECTS,
} from "task-e2e";

const E2E_SESSION_TOKEN = "e2e-wrike-session-token";

/**
 * E2E scenario: disconnect (with cancel), disconnect for real, then reconnect via simulated OAuth.
 */
export async function disconnectPlatform({
  page,
  platformConfig,
  connection,
}: PlatformE2eScenarioContext): Promise<void> {
  await connection.blockOAuthPopups();
  await connection.setSessionCookieByBaseUrl(E2E_SESSION_TOKEN);
  await connection.mockConnectionStatusFromSessionCookie();
  await connection.mockDisconnectApi();
  await connection.mockSetupComplete();
  await installTaskManagerShellApiMocks(page, platformConfig, {
    projects: [{ ...TASK_LIST_E2E_PROJECTS.demo }],
  });
  const shellDataReady = beginWaitingForTaskListShellData(page, platformConfig);
  await gotoTaskManager(page, platformConfig);
  await shellDataReady;
  await assertConnectedLabel(page, platformConfig);

  await openSettingsPanel(page);
  await openDisconnectConfirm(page);
  await cancelDisconnect(page);
  await assertConnectedLabel(page, platformConfig);

  await openSettingsPanel(page);
  await openDisconnectConfirm(page);
  const disconnectResponse = connection.waitForDisconnectResponse();
  await confirmDisconnect(page);
  await disconnectResponse;

  await connection.assertSessionCookieAbsent();
  await assertDisconnected(page, platformConfig);

  await connection.setSessionCookieByBaseUrl(E2E_SESSION_TOKEN);
  await clickConnectAccount(page, platformConfig);
  const statusRefresh = connection.beginWaitingForConnectionStatusRefresh();
  await connection.simulateOAuthConnected();
  await statusRefresh;
  await assertConnectedLabel(page, platformConfig);
}
