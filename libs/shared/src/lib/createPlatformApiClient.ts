import axios, {
  type AxiosInstance,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

type RequestConfigWithRetry = InternalAxiosRequestConfig & { _retry?: boolean };

export interface PlatformToken {
  accessToken: string;
  /** Absent for platforms that don't issue refresh tokens (e.g. oauth2-static, api-key). */
  refreshToken?: string;
  /** ISO timestamp. Absent for non-expiring tokens. */
  expiry?: string;
  tokenType: "bearer";
}

export type PlatformApiClientOptions = {
  /** Route called to refresh the access token. Must not go through the returned apiClient (avoids loop). */
  refreshUrl: string;
  /** Base URL for all API requests. Defaults to "/api". */
  baseUrl?: string;
};

export type PlatformApiClient = {
  apiClient: AxiosInstance;
  setCurrentPlatformToken: (token: PlatformToken | null) => void;
  getCurrentPlatformToken: () => PlatformToken | null;
  setOnAuthFailureCallback: (cb: (() => void) | null) => void;
};

/**
 * Creates a platform API client with:
 * - Bearer token injection on every request
 * - Automatic token refresh on 401, with a single in-flight refresh shared across concurrent requests
 * - Auth failure callback (e.g. show a re-auth dialog) when refresh also returns 401
 *
 * Each platform app calls this once at module scope, passing its own refresh URL.
 */
export function createPlatformApiClient(options: PlatformApiClientOptions): PlatformApiClient {
  const { refreshUrl, baseUrl = "/api" } = options;

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

  // baseUrl defaults to "/api". Platform API path definitions (e.g. apiPaths.ts in each
  // platform app) must NOT include this prefix — they should start with "/<platform>/..."
  // so they resolve correctly to "/api/<platform>/...".
  const instance = axios.create({
    baseURL: baseUrl,
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
    async (error: unknown) => {
      if (!axios.isAxiosError(error)) return Promise.reject(error);

      const originalRequest = error.config as RequestConfigWithRetry | undefined;
      if (!originalRequest) return Promise.reject(error);

      if (error.response?.status === 401 && !originalRequest._retry) {
        originalRequest._retry = true;
        const newToken = await refreshAccessToken();

        if (newToken?.accessToken) {
          originalRequest.headers.Authorization = `Bearer ${newToken.accessToken}`;
          return instance(originalRequest);
        }

        onAuthFailureCallback?.();
      }

      return Promise.reject(error);
    },
  );

  return {
    apiClient: instance,
    setCurrentPlatformToken,
    getCurrentPlatformToken,
    setOnAuthFailureCallback,
  };
}
