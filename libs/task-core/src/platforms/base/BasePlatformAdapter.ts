import axios from "axios";

import { PlatformApiError } from "../../types/errors";
import type { PlatformToken } from "../../types/platform";

/**
 * Minimal platform-agnostic adapter base.
 * Platform-specific adapters (JiraAdapter, etc.) extend this with their own typed methods.
 */
export abstract class BasePlatformAdapter {
  abstract authenticate(authCode: string, redirectUri: string): Promise<PlatformToken>;
  abstract refreshToken(token: PlatformToken): Promise<PlatformToken>;

  /**
   * Normalises any thrown value into a PlatformApiError and re-throws.
   * Use in adapter catch blocks:
   *   `} catch (err) { BasePlatformAdapter.handleError(err); }`
   */
  static handleError(err: unknown): never {
    if (err instanceof PlatformApiError) throw err;
    if (axios.isAxiosError(err) && err.response) {
      const data = err.response.data as Record<string, string | undefined> | undefined;
      throw new PlatformApiError(data?.message ?? data?.error ?? err.message, err.response.status);
    }
    if (err instanceof Error) throw new PlatformApiError(err.message, 500);
    throw new PlatformApiError("An unexpected error occurred.", 500);
  }
}
