import type { PlatformToken } from "../../types/platform";

/**
 * Minimal platform-agnostic adapter interface.
 * Platform-specific adapters (JiraAdapter, etc.) extend this with their own typed methods.
 */
export interface BasePlatformAdapter {
  authenticate(authCode: string, redirectUri: string): Promise<PlatformToken>;
  refreshToken(token: PlatformToken): Promise<PlatformToken>;
}
