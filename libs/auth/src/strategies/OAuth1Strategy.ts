import type { AxiosInstance } from "axios";

import type { AuthConfig, AuthStrategy, TokenSet } from "../types";
import { BaseAuthStrategy } from "./BaseAuthStrategy";

type Config = Extract<AuthConfig, { type: "oauth1" }>;

/**
 * OAuth 1.0a three-legged flow with HMAC-SHA1 per-request signing.
 * Used by Trello.
 *
 * Not yet implemented — add when integrating an OAuth 1.0a platform.
 * Install `oauth-1.0a` and `crypto` to complete this strategy.
 */
export class OAuth1Strategy extends BaseAuthStrategy implements AuthStrategy {
  constructor(_config: Config) {
    super();
  }

  getConnectUrl(_state: string): string {
    throw new Error(
      "OAuth1Strategy is not yet implemented. " +
        "Implement this strategy in libs/auth when integrating an OAuth 1.0a platform (e.g. Trello).",
    );
  }

  async handleCallback(_params: Record<string, string>, _userId: string): Promise<TokenSet> {
    throw new Error("OAuth1Strategy is not yet implemented.");
  }

  async getValidToken(_userId: string): Promise<string> {
    throw new Error("OAuth1Strategy is not yet implemented.");
  }

  async getClient(_userId: string): Promise<AxiosInstance> {
    throw new Error("OAuth1Strategy is not yet implemented.");
  }

  async revoke(_userId: string): Promise<void> {
    throw new Error("OAuth1Strategy is not yet implemented.");
  }

  async status(_userId: string): Promise<{ connected: boolean }> {
    throw new Error("OAuth1Strategy is not yet implemented.");
  }
}
