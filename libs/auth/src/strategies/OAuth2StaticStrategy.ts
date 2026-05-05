import type { AxiosInstance } from "axios";
import axios from "axios";

import type { AuthConfig, AuthStrategy, TokenSet } from "../types";
import { BaseAuthStrategy } from "./BaseAuthStrategy";

type Config = Extract<AuthConfig, { type: "oauth2-static" }>;

/**
 * OAuth 2.0 authorization code flow where the access token never expires
 * and no refresh token is issued. Used by ClickUp, Notion, Monday.com.
 */
export class OAuth2StaticStrategy extends BaseAuthStrategy implements AuthStrategy {
  constructor(private readonly config: Config) {
    super();
  }

  getConnectUrl(state: string): string {
    const { oauth2 } = this.config;
    const params = new URLSearchParams({
      client_id: oauth2.clientId,
      response_type: "code",
      redirect_uri: oauth2.redirectUri,
      state,
      ...oauth2.extraParams,
    });
    if (oauth2.scopes.length > 0) {
      const scopeSep = oauth2.scopeSeparator ?? " ";
      params.set("scope", oauth2.scopes.join(scopeSep));
    }
    return `${oauth2.authorizeUrl}?${params}`;
  }

  async handleCallback(params: Record<string, string>, userId: string): Promise<TokenSet> {
    const { code } = params;
    if (!code) throw new Error("OAuth2 callback is missing `code` parameter.");

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

    const tokenSet: TokenSet = {
      accessToken: response.data["access_token"] as string,
      tokenType: "Bearer",
      // No expiresAt — token is permanent.
    };

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
    return connection.token.accessToken;
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
}
