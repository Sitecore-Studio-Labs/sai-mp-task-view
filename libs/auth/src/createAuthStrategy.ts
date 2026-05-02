import { ApiKeyStrategy } from "./strategies/ApiKeyStrategy";
import { OAuth1Strategy } from "./strategies/OAuth1Strategy";
import { OAuth2RefreshStrategy } from "./strategies/OAuth2RefreshStrategy";
import { OAuth2StaticStrategy } from "./strategies/OAuth2StaticStrategy";
import type { AuthConfig, AuthStrategy } from "./types";

/**
 * Factory that maps an AuthConfig descriptor to the correct strategy instance.
 *
 * Adding a new auth type:
 *  1. Implement a new class in libs/auth/src/strategies/
 *  2. Add it to the AuthType union in types.ts
 *  3. Add a case here
 *  4. Update capabilities/base.yaml and the generator's YAML schema
 */
export function createAuthStrategy(config: AuthConfig): AuthStrategy {
  switch (config.type) {
    case "oauth2-refresh":
      return new OAuth2RefreshStrategy(config);

    case "oauth2-static":
      return new OAuth2StaticStrategy(config);

    case "oauth1":
      // Implement OAuth1Strategy when integrating an OAuth 1.0a platform (e.g. Trello).
      return new OAuth1Strategy(config);

    case "api-key":
      return new ApiKeyStrategy(config);

    default: {
      const exhaustive: never = config;
      throw new Error(`createAuthStrategy: unknown auth type "${(exhaustive as AuthConfig).type}"`);
    }
  }
}
