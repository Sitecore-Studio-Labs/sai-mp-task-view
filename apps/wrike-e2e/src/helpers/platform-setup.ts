import type { PlatformE2eScenarioContext } from "task-e2e";

import { completePlatformOAuth } from "./platform-auth";

/**
 * Connect (if needed) and complete the setup wizard.
 * Call from scenarios that require an active task list — not from connectPlatform.
 */
export async function ensureConnectedAndSetup(
  ctx: Pick<PlatformE2eScenarioContext, "page" | "platformConfig">,
): Promise<void> {
  await completePlatformOAuth(ctx);
  // TODO: complete setup wizard using task-e2e page objects and env vars for scope selection.
  throw new Error("platform-setup: ensureConnectedAndSetup not implemented");
}
