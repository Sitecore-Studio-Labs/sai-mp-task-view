import type { BaseTokenStore } from "@mp/token-storage";
import type { AxiosInstance } from "axios";

// ── Auth type discriminant ────────────────────────────────────────────────────

export type AuthType = "oauth2-refresh" | "oauth2-static" | "oauth1" | "api-key";

// ── Token representation ──────────────────────────────────────────────────────

/** Live token set returned from auth server or reconstructed from storage. */
export interface TokenSet {
  accessToken: string;
  /** Absent for oauth2-static, oauth1, api-key. */
  refreshToken?: string;
  /** Unix ms timestamp. Absent for non-expiring token types. */
  expiresAt?: number;
  tokenType: string;
}

// ── Per-type config objects ───────────────────────────────────────────────────

export interface OAuth2Params {
  authorizeUrl: string;
  tokenUrl: string;
  scopes: string[];
  /**
   * Joins `scopes` for the authorize URL `scope` query param.
   * Defaults to `" "` (RFC-style). Wrike requires `", "`.
   */
  scopeSeparator?: string;
  /** Client ID from env — not in YAML. */
  clientId: string;
  /** Client secret from env — not in YAML. */
  clientSecret: string;
  /** OAuth redirect URI from env — not in YAML. */
  redirectUri: string;
  /**
   * Whether each refresh call issues a new refresh token and immediately
   * invalidates the previous one. True for Jira and Wrike; false for Asana/Linear.
   */
  rotatingRefreshToken?: boolean;
  /** Extra query params appended to the authorize URL (e.g. Jira's audience). */
  extraParams?: Record<string, string>;
  /**
   * How client credentials are sent to the token endpoint.
   * Defaults to "client_secret_post" (credentials in request body).
   * Set to "client_secret_basic" for platforms like Notion.
   */
  tokenEndpointAuthMethod?: "client_secret_post" | "client_secret_basic";
}

export interface OAuth1Params {
  requestTokenUrl: string;
  authorizeUrl: string;
  accessTokenUrl: string;
  signatureMethod: "HMAC-SHA1";
  consumerKey: string;
  consumerSecret: string;
  callbackUrl: string;
}

// ── AuthConfig discriminated union ────────────────────────────────────────────

export type AuthConfig =
  | { type: "oauth2-refresh"; oauth2: OAuth2Params; tokenStore: BaseTokenStore }
  | { type: "oauth2-static"; oauth2: OAuth2Params; tokenStore: BaseTokenStore }
  | { type: "oauth1"; oauth1: OAuth1Params; tokenStore: BaseTokenStore }
  | { type: "api-key"; tokenStore: BaseTokenStore };

// ── AuthStrategy interface ────────────────────────────────────────────────────

export interface AuthStrategy {
  /**
   * Builds the redirect URL that starts the auth flow.
   * Throws for api-key (no OAuth flow).
   */
  getConnectUrl(state: string): string;

  /**
   * Exchanges an auth code (or API key) for tokens and persists them.
   * For oauth2: params contains `code` from the callback URL.
   * For api-key: params contains `apiKey` entered by the user.
   * Returns the resulting TokenSet (useful for extracting extras like cloudId).
   */
  handleCallback(params: Record<string, string>, userId: string): Promise<TokenSet>;

  /**
   * Returns a valid access token string, refreshing if needed.
   * For non-expiring types (oauth2-static, oauth1, api-key) returns stored token.
   */
  getValidToken(userId: string): Promise<string>;

  /**
   * Returns an axios instance configured to authenticate all requests for this user.
   * - oauth2-*: sets Authorization: Bearer with an auto-refreshed token via interceptor.
   * - oauth1:   applies HMAC-SHA1 request-signing interceptor.
   * - api-key:  sets Authorization: Bearer with the stored key.
   */
  getClient(userId: string): Promise<AxiosInstance>;

  /** Revokes stored tokens and marks the connection inactive. */
  revoke(userId: string): Promise<void>;

  /** Returns whether a valid connection exists for this user. */
  status(userId: string): Promise<{ connected: boolean }>;
}
