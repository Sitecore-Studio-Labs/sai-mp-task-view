import axios from "axios";
import { GraphQLClient } from "graphql-request";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createGraphQLClient } from "../createGraphQLClient";
import type { PlatformToken } from "../createPlatformApiClient";

vi.mock("graphql-request");
vi.mock("axios");

const ENDPOINT = "https://api.example.com/graphql";
const REFRESH_URL = "/api/auth/example/refresh";

const mockToken: PlatformToken = {
  accessToken: "access-token-abc",
  refreshToken: "refresh-token-xyz",
  expiry: "2099-01-01T00:00:00.000Z",
  tokenType: "bearer",
};

const mockRequestFn = vi.fn();
const mockSetHeaders = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(GraphQLClient).mockImplementation(
    () => ({ request: mockRequestFn, setHeaders: mockSetHeaders }) as unknown as GraphQLClient,
  );
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("createGraphQLClient", () => {
  it("returns the correct interface shape", () => {
    const client = createGraphQLClient({ endpoint: ENDPOINT, refreshUrl: REFRESH_URL });
    expect(typeof client.request).toBe("function");
    expect(typeof client.setCurrentPlatformToken).toBe("function");
    expect(typeof client.getCurrentPlatformToken).toBe("function");
    expect(typeof client.setOnAuthFailureCallback).toBe("function");
  });

  it("getCurrentPlatformToken returns null initially", () => {
    const client = createGraphQLClient({ endpoint: ENDPOINT, refreshUrl: REFRESH_URL });
    expect(client.getCurrentPlatformToken()).toBeNull();
  });

  it("setCurrentPlatformToken / getCurrentPlatformToken round-trip", () => {
    const client = createGraphQLClient({ endpoint: ENDPOINT, refreshUrl: REFRESH_URL });
    client.setCurrentPlatformToken(mockToken);
    expect(client.getCurrentPlatformToken()).toEqual(mockToken);
    client.setCurrentPlatformToken(null);
    expect(client.getCurrentPlatformToken()).toBeNull();
  });

  it("injects Bearer token header before each request", async () => {
    mockRequestFn.mockResolvedValueOnce({ data: "ok" });
    const client = createGraphQLClient({ endpoint: ENDPOINT, refreshUrl: REFRESH_URL });
    client.setCurrentPlatformToken(mockToken);

    await client.request<{ data: string }>("query { me { id } }");

    expect(mockSetHeaders).toHaveBeenCalledWith({
      Authorization: `Bearer ${mockToken.accessToken}`,
    });
    expect(mockRequestFn).toHaveBeenCalledWith("query { me { id } }", undefined);
  });

  it("injects empty headers when no token is set", async () => {
    mockRequestFn.mockResolvedValueOnce({ viewer: { id: "1" } });
    const client = createGraphQLClient({ endpoint: ENDPOINT, refreshUrl: REFRESH_URL });

    await client.request("query { viewer { id } }");

    expect(mockSetHeaders).toHaveBeenCalledWith({});
  });

  it("retries with new token after a 401 error and refresh succeeds", async () => {
    const unauthorizedError = Object.assign(new Error("401 Unauthorized"), {
      response: { status: 401 },
    });
    mockRequestFn
      .mockRejectedValueOnce(unauthorizedError)
      .mockResolvedValueOnce({ me: { id: "42" } });

    const newToken: PlatformToken = { ...mockToken, accessToken: "new-access-token" };
    vi.mocked(axios.post).mockResolvedValueOnce({ data: newToken });

    const client = createGraphQLClient({ endpoint: ENDPOINT, refreshUrl: REFRESH_URL });
    client.setCurrentPlatformToken(mockToken);

    const result = await client.request<{ me: { id: string } }>("query { me { id } }");

    expect(result).toEqual({ me: { id: "42" } });
    expect(axios.post).toHaveBeenCalledWith(REFRESH_URL, undefined, { withCredentials: true });
    expect(mockRequestFn).toHaveBeenCalledTimes(2);
  });

  it("calls onAuthFailureCallback and rethrows when refresh fails after 401", async () => {
    const unauthorizedError = Object.assign(new Error("401 Unauthorized"), {
      response: { status: 401 },
    });
    mockRequestFn.mockRejectedValue(unauthorizedError);
    vi.mocked(axios.post).mockRejectedValueOnce(new Error("refresh failed"));

    const onAuthFailure = vi.fn();
    const client = createGraphQLClient({ endpoint: ENDPOINT, refreshUrl: REFRESH_URL });
    client.setCurrentPlatformToken(mockToken);
    client.setOnAuthFailureCallback(onAuthFailure);

    await expect(client.request("query { me { id } }")).rejects.toThrow("401 Unauthorized");
    expect(onAuthFailure).toHaveBeenCalledOnce();
  });

  it("does not retry on non-401 errors", async () => {
    const serverError = new Error("500 Internal Server Error");
    mockRequestFn.mockRejectedValueOnce(serverError);

    const client = createGraphQLClient({ endpoint: ENDPOINT, refreshUrl: REFRESH_URL });
    client.setCurrentPlatformToken(mockToken);

    await expect(client.request("query { projects }")).rejects.toThrow("500 Internal Server Error");
    expect(mockRequestFn).toHaveBeenCalledTimes(1);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it("deduplicates concurrent refresh calls", async () => {
    const unauthorizedError = Object.assign(new Error("401 Unauthorized"), {
      response: { status: 401 },
    });

    let resolveRefresh!: (value: { data: PlatformToken }) => void;
    const refreshDeferred = new Promise<{ data: PlatformToken }>((res) => {
      resolveRefresh = res;
    });
    vi.mocked(axios.post).mockReturnValueOnce(refreshDeferred as ReturnType<typeof axios.post>);

    mockRequestFn
      .mockRejectedValueOnce(unauthorizedError)
      .mockRejectedValueOnce(unauthorizedError)
      .mockResolvedValue({ ok: true });

    const newToken: PlatformToken = { ...mockToken, accessToken: "refreshed" };

    const client = createGraphQLClient({ endpoint: ENDPOINT, refreshUrl: REFRESH_URL });
    client.setCurrentPlatformToken(mockToken);

    const [r1, r2] = [
      client.request("query { a }").catch(() => null),
      client.request("query { b }").catch(() => null),
    ];

    resolveRefresh({ data: newToken });
    await Promise.all([r1, r2]);

    expect(axios.post).toHaveBeenCalledTimes(1);
  });
});
