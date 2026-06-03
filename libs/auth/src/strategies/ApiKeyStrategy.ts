import type { AxiosInstance } from "axios";
import axios from "axios";

import type { AuthConfig, AuthStrategy, TokenSet } from "../types";
import { BaseAuthStrategy } from "./BaseAuthStrategy";

type Config = Extract<AuthConfig, { type: "api-key" }>;

/**
 * Static API key strategy — the user enters their key via a form and it is
 * stored as the access token. No OAuth flow involved.
 *
 * Connect route should POST { apiKey } and call handleCallback({ apiKey }, userId).
 */
export class ApiKeyStrategy extends BaseAuthStrategy implements AuthStrategy {
  constructor(private readonly config: Config) {
    super();
  }

  getConnectUrl(_state: string): string {
    throw new Error(
      "ApiKeyStrategy does not use an OAuth redirect flow. " +
        "Render a key-entry form instead and POST the key to handleCallback.",
    );
  }

  async handleCallback(params: Record<string, string>, userId: string): Promise<TokenSet> {
    const { apiKey } = params;
    if (!apiKey?.trim()) throw new Error("handleCallback: `apiKey` is required.");

    const tokenSet: TokenSet = { accessToken: apiKey.trim(), tokenType: "Bearer" };

    await this.config.tokenStore.saveConnection({
      userId,
      platformSite: "",
      platformProject: "",
      token: this.tokenSetToStored(tokenSet),
    });

    return tokenSet;
  }

  async getValidToken(userId: string): Promise<string> {
    const connection = await this.config.tokenStore.getConnection(userId);
    if (!connection) throw new Error(`No active connection for user ${userId}.`);
    return connection.token.accessToken;
  }

  async getClient(userId: string): Promise<AxiosInstance> {
    const client = axios.create();
    client.interceptors.request.use(async (reqConfig) => {
      const key = await this.getValidToken(userId);
      reqConfig.headers = reqConfig.headers ?? {};
      reqConfig.headers["Authorization"] = `Bearer ${key}`;
      return reqConfig;
    });
    return client;
  }

  async revoke(userId: string): Promise<void> {
    const connection = await this.config.tokenStore.getConnection(userId);
    if (connection) {
      await this.config.tokenStore.deactivateConnection(connection.connectionId);
    }
  }

  async status(userId: string): Promise<{ connected: boolean }> {
    const connection = await this.config.tokenStore.getConnection(userId);
    return { connected: connection !== null };
  }
}
