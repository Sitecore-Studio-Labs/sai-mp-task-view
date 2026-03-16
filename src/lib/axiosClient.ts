import axios, { AxiosError, AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import type { PlatformToken } from "@/types/platform";

/** Extended request config used to mark a request as already retried (avoids refresh loop). */
type RequestConfigWithRetry = InternalAxiosRequestConfig & { _retry?: boolean };

/**
 * In-memory token store for the API client.
 * Call setCurrentPlatformToken after login/OAuth or hydrate from a session endpoint (e.g. GET /api/auth/jira/session).
 */
let currentToken: PlatformToken | null = null;

let onAuthFailureCallback: (() => void) | null = null;

export const setOnAuthFailureCallback = (cb: (() => void) | null): void => {
  onAuthFailureCallback = cb;
};

export const setCurrentPlatformToken = (token: PlatformToken | null) => {
  currentToken = token;
};

export const getCurrentPlatformToken = (): PlatformToken | null => currentToken;

/** In-flight refresh promise so multiple 401s share one refresh attempt. */
let refreshPromise: Promise<PlatformToken | null> | null = null;

/**
 * Calls the app refresh route (no auth header needed); the route uses server-side user identity
 * and Supabase to refresh the Jira token, then returns the new PlatformToken.
 */
const refreshAccessToken = async (): Promise<PlatformToken | null> => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await axios.post<PlatformToken>(
        "/api/auth/jira/refresh",
        undefined,
        { withCredentials: true }
      );
      const newToken = response.data;
      setCurrentPlatformToken(newToken);
      return newToken;
    } catch (err) {
      setCurrentPlatformToken(null);
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

/**
 * Shared API client for Next.js API routes. Uses interceptors to:
 * - Attach the current access token as Bearer on every request (when set)
 * - On 401: call refresh, store new token, retry the original request once
 */
export const apiClient: AxiosInstance = (() => {
  const instance = axios.create({
    baseURL: "/api",
    headers: { "Content-Type": "application/json" },
  });

  instance.interceptors.request.use((config: InternalAxiosRequestConfig) => {
    if (currentToken?.accessToken) {
      config.headers.Authorization = `Bearer ${currentToken.accessToken}`;
    }
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      delete (config.headers as Record<string, unknown>)["Content-Type"];
    }
    return config;
  });

  instance.interceptors.response.use(
    (response: AxiosResponse) => response,
    async (error: AxiosError) => {
      const originalRequest = error.config as RequestConfigWithRetry | undefined;

      if (!originalRequest) return Promise.reject(error);

      const isUnauthorized = error.response?.status === 401;
      const notYetRetried = !originalRequest._retry;

      if (isUnauthorized && notYetRetried) {
        originalRequest._retry = true;
        const newToken = await refreshAccessToken();

        if (newToken?.accessToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken.accessToken}`;
          return instance(originalRequest);
        }

        onAuthFailureCallback?.();
      }

      return Promise.reject(error);
    }
  );

  return instance;
})();

