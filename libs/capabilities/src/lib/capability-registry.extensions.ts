import type { PlatformCapabilities } from "./capability-types";
// @nx-capability-registry-extensions:imports-start
import { WrikeCapabilities } from "./platforms/wrike.capabilities";
// @nx-capability-registry-extensions:imports-end

export const ADDITIONAL_CAPABILITIES: Record<string, PlatformCapabilities> = {
  // @nx-capability-registry-extensions:entries-start
  wrike: WrikeCapabilities,
  // @nx-capability-registry-extensions:entries-end
};
