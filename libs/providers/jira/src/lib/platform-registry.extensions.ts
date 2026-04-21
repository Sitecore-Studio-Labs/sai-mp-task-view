import type { TaskPlatformProvider } from "@sai-mp-jira-task-view/platform";
// @nx-platform-registry-extensions:imports-start
import { WrikeTaskPlatformProvider } from "@sai-mp-jira-task-view/wrike-providers";

import type { JiraBffTransportOptions } from "./jira-bff-client";
// @nx-platform-registry-extensions:imports-end

type PlatformProviderCtor = new (options?: JiraBffTransportOptions) => TaskPlatformProvider;

export const ADDITIONAL_PLATFORM_PROVIDERS: Partial<Record<string, PlatformProviderCtor>> = {
  // @nx-platform-registry-extensions:entries-start
  wrike: WrikeTaskPlatformProvider,
  // @nx-platform-registry-extensions:entries-end
};
