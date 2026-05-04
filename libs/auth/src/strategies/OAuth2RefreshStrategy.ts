import type { AxiosInstance } from "axios";
import axios from "axios";

import type { AuthConfig, AuthStrategy, TokenSet } from "../types";
import { BaseAuthStrategy } from "./BaseAuthStrategy";

type Config = Extract<AuthConfig, { type: "oauth2-refresh" }>;

export class OAuth2RefreshStrategy extends BaseAuthStrategy implements AuthStrategy {
  constructor(private readonly config: Config) {
    super();
  }

  getConnectUrl(state: string): string {
    const { oauth2 } = this.config;
    const params = new URLSearchParams({
      client_id: oauth2.clientId,
      response_type: "code",
      redirect_uri: oauth2.redirectUri,
      scope: oauth2.scopes.join(" "),
      state,
      ...oauth2.extraParams,
    });
    return `${oauth2.authorizeUrl}?${params}`;
  }

  async handleCallback(params: Record<string, string>, userId: string): Promise<TokenSet> {
    const { code } = params;
    if (!code) throw new Error("OAuth2 callback is missing `code` parameter.");

    const tokenSet = await this.exchangeCode(code);
    await this.config.tokenStore.saveConnection({
      userId,
      platformSite: params["site"] ?? "",
      platformProject: "",
      token: this.tokenSetToStored(tokenSet),
    });
    return tokenSet;
  }

  async getValidToken(userId: string): Promise<string> {
    const connection = await this.config.tokenStore.getConnection(userId);
    if (!connection) throw new Error(`No active connection for user ${userId}.`);

    const tokenSet = this.connectionToTokenSet(connection);
    if (!this.isExpired(tokenSet)) return tokenSet.accessToken;

    const refreshed = await this.doRefresh(
      connection.token.refreshToken ?? "",
      connection.connectionId,
      connection.token.refreshToken,
    );
    await this.config.tokenStore.saveConnection({
      userId,
      platformSite: connection.platformSite,
      platformProject: connection.platformProject,
      token: this.tokenSetToStored(refreshed),
    });
    return refreshed.accessToken;
  }

  async getClient(userId: string): Promise<AxiosInstance> {
    const client = axios.create();
    client.interceptors.request.use(async (reqConfig) => {
      const token = await this.getValidToken(userId);
      reqConfig.headers = reqConfig.headers ?? {};
      reqConfig.headers["Authorization"] = `Bearer ${token}`;
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

  // ── private ─────────────────────────────────────────────────────────────────

  private async exchangeCode(code: string): Promise<TokenSet> {
    const { oauth2 } = this.config;
    const body: Record<string, string> = {
      grant_type: "authorization_code",
      code,
      redirect_uri: oauth2.redirectUri,
    };

    const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };

    if ((oauth2.tokenEndpointAuthMethod ?? "client_secret_post") === "client_secret_basic") {
      const creds = Buffer.from(`${oauth2.clientId}:${oauth2.clientSecret}`).toString("base64");
      headers["Authorization"] = `Basic ${creds}`;
    } else {
      body["client_id"] = oauth2.clientId;
      body["client_secret"] = oauth2.clientSecret;
    }

    const response = await axios.post<Record<string, unknown>>(
      oauth2.tokenUrl,
      new URLSearchParams(body).toString(),
      { headers },
    );

    return this.parseTokenResponse(response.data);
  }

  private async doRefresh(
    refreshToken: string,
    connectionId: string,
    existingRefreshToken?: string,
  ): Promise<TokenSet> {
    const { oauth2 } = this.config;
    const body: Record<string, string> = {
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    };

    const headers: Record<string, string> = { "Content-Type": "application/x-www-form-urlencoded" };

    if ((oauth2.tokenEndpointAuthMethod ?? "client_secret_post") === "client_secret_basic") {
      const creds = Buffer.from(`${oauth2.clientId}:${oauth2.clientSecret}`).toString("base64");
      headers["Authorization"] = `Basic ${creds}`;
    } else {
      body["client_id"] = oauth2.clientId;
      body["client_secret"] = oauth2.clientSecret;
    }

    try {
      const response = await axios.post<Record<string, unknown>>(
        oauth2.tokenUrl,
        new URLSearchParams(body).toString(),
        { headers },
      );
      return this.parseTokenResponse(response.data, existingRefreshToken);
    } catch (err) {
      // Refresh failed — deactivate so the user is prompted to reconnect.
      await this.config.tokenStore.deactivateConnection(connectionId);
      throw new Error(`Token refresh failed: ${(err as Error).message}`);
    }
  }

  private parseTokenResponse(
    data: Record<string, unknown>,
    fallbackRefreshToken?: string,
  ): TokenSet {
    const accessToken = data["access_token"] as string;
    // Non-rotating servers don't return a new refresh token — keep the existing one.
    const refreshToken =
      (data["refresh_token"] as string | undefined) ??
      (this.config.oauth2.rotatingRefreshToken ? undefined : fallbackRefreshToken);

    const expiresIn =
      typeof data["expires_in"] === "number" ? (data["expires_in"] as number) : undefined;
    const expiresAt = expiresIn != null ? Date.now() + expiresIn * 1000 : undefined;

    return { accessToken, refreshToken, expiresAt, tokenType: "Bearer" };
  }
}
