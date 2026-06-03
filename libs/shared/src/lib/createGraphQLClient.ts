import axios from "axios";
import { GraphQLClient } from "graphql-request";

import type { PlatformToken } from "./createPlatformApiClient";

export type { PlatformToken };

export type PlatformGraphQLClientOptions = {
  /** GraphQL endpoint URL (e.g. "https://api.monday.com/v2"). */
  endpoint: string;
  /** Route called to refresh the access token on 401. Must not go through the returned client. */
  refreshUrl: string;
};

export type PlatformGraphQLClient = {
  /**
   * Execute a GraphQL request. Bearer token is injected automatically.
   * On 401, attempts one token refresh then retries before invoking the auth failure callback.
   */
  request: <T>(query: string, variables?: Record<string, unknown>) => Promise<T>;
  setCurrentPlatformToken: (token: PlatformToken | null) => void;
  getCurrentPlatformToken: () => PlatformToken | null;
  setOnAuthFailureCallback: (cb: (() => void) | null) => void;
};

/**
 * Creates a GraphQL client with the same token lifecycle as createPlatformApiClient:
 * - Bearer token injection on every request
 * - Automatic token refresh on 401, with a single in-flight refresh shared across concurrent requests
 * - Auth failure callback when refresh also fails
 *
 * Use for platforms with GraphQL-only APIs (monday.com, Linear).
 */
export function createGraphQLClient(options: PlatformGraphQLClientOptions): PlatformGraphQLClient {
  const { endpoint, refreshUrl } = options;

  let currentToken: PlatformToken | null = null;
  let onAuthFailureCallback: (() => void) | null = null;
  let refreshPromise: Promise<PlatformToken | null> | null = null;

  const setCurrentPlatformToken = (token: PlatformToken | null): void => {
    currentToken = token;
  };

  const getCurrentPlatformToken = (): PlatformToken | null => currentToken;

  const setOnAuthFailureCallback = (cb: (() => void) | null): void => {
    onAuthFailureCallback = cb;
  };

  const refreshAccessToken = async (): Promise<PlatformToken | null> => {
    if (refreshPromise) return refreshPromise;

    refreshPromise = (async () => {
      try {
        const response = await axios.post<PlatformToken>(refreshUrl, undefined, {
          withCredentials: true,
        });
        setCurrentPlatformToken(response.data);
        return response.data;
      } catch {
        setCurrentPlatformToken(null);
        return null;
      } finally {
        refreshPromise = null;
      }
    })();

    return refreshPromise;
  };

  const buildHeaders = (): Record<string, string> =>
    currentToken?.accessToken ? { Authorization: `Bearer ${currentToken.accessToken}` } : {};

  const client = new GraphQLClient(endpoint);

  const request = async <T>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    client.setHeaders(buildHeaders());
    try {
      return await client.request<T>(query, variables);
    } catch (error: unknown) {
      type ErrorWithResponse = { message: string; response?: { status?: number } };
      const err = error as ErrorWithResponse;
      const isUnauthorized =
        typeof err?.message === "string" &&
        (err.message.includes("401") || err.response?.status === 401);

      if (!isUnauthorized) throw error;

      const newToken = await refreshAccessToken();
      if (newToken?.accessToken) {
        client.setHeaders(buildHeaders());
        return client.request<T>(query, variables);
      }

      onAuthFailureCallback?.();
      throw error;
    }
  };

  return { request, setCurrentPlatformToken, getCurrentPlatformToken, setOnAuthFailureCallback };
}
