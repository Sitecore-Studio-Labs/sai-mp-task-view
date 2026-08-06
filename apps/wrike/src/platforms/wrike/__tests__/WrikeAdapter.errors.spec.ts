import axios, { type AxiosError, type AxiosInstance } from "axios";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { WrikeClientError } from "@/exceptions/wrikeErrors";
import { WrikeAdapter } from "@/platforms/wrike/WrikeAdapter";

describe("WrikeAdapter HTTP error interceptor", () => {
  let responseErrorHandler: (error: AxiosError) => Promise<unknown>;
  let mockClient: AxiosInstance;

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        response: {
          use: vi.fn((_onFulfilled, onRejected) => {
            responseErrorHandler = onRejected;
          }),
        },
      },
    } as unknown as AxiosInstance;

    vi.spyOn(axios, "create").mockReturnValue(mockClient);
    new WrikeAdapter("https://www.wrike.com");
  });

  it("wraps 429 responses in WrikeClientError with retry messaging", async () => {
    const error = {
      response: {
        status: 429,
        data: { error: "too_many_requests", errorDescription: "Rate limit exceeded" },
      },
    } as AxiosError;

    await expect(responseErrorHandler(error)).rejects.toMatchObject({
      name: "WrikeClientError",
      statusCode: 429,
      message: "Too many requests to Wrike. Please wait a moment and try again.",
    });
    await expect(responseErrorHandler(error)).rejects.toBeInstanceOf(WrikeClientError);
  });

  it("wraps 503 responses in WrikeClientError with retry messaging", async () => {
    const error = {
      response: {
        status: 503,
        data: { error: "server_error", errorDescription: "Internal server error" },
      },
    } as AxiosError;

    await expect(responseErrorHandler(error)).rejects.toMatchObject({
      name: "WrikeClientError",
      statusCode: 503,
      message: "Wrike is temporarily unavailable. Please try again in a few minutes.",
    });
  });

  it("wraps network errors in WrikeClientError with retry messaging", async () => {
    const error = { message: "Network Error", code: "ERR_NETWORK" } as AxiosError;

    await expect(responseErrorHandler(error)).rejects.toMatchObject({
      name: "WrikeClientError",
      statusCode: 502,
      message: "Could not connect to Wrike. Please try again in a few minutes.",
      platformCode: "network_error",
    });
  });

  it("wraps timeout errors in WrikeClientError", async () => {
    const error = { message: "timeout of 5000ms exceeded", code: "ECONNABORTED" } as AxiosError;

    await expect(responseErrorHandler(error)).rejects.toMatchObject({
      name: "WrikeClientError",
      statusCode: 502,
      message: "Request to Wrike timed out. Please check your connection and try again.",
    });
  });

  it("wraps DNS/connection refused errors in WrikeClientError", async () => {
    const error = {
      message: "getaddrinfo ENOTFOUND app.wrike.com",
      code: "ENOTFOUND",
    } as AxiosError;

    await expect(responseErrorHandler(error)).rejects.toMatchObject({
      name: "WrikeClientError",
      statusCode: 502,
      message: "Could not reach Wrike. Please check your connection and try again.",
    });
  });
});

describe("WrikeAdapter createComment", () => {
  let mockClient: AxiosInstance;
  let adapter: WrikeAdapter;

  beforeEach(() => {
    mockClient = {
      get: vi.fn(),
      post: vi.fn().mockResolvedValue({ data: { data: [{ id: "c1", text: "hi" }] } }),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        response: {
          use: vi.fn(),
        },
      },
    } as unknown as AxiosInstance;

    vi.spyOn(axios, "create").mockReturnValue(mockClient);
    adapter = new WrikeAdapter("https://www.wrike.com");
  });

  it("posts mention HTML via query params and omits plainText when false", async () => {
    const token = { accessToken: "tok", tokenType: "bearer" as const };
    const mention = '<a class="stream-user-id avatar" rel="KX77ABC">@Sanduni Galagoda</a> hi';

    await adapter.createComment(token, {
      taskId: "task-1",
      text: mention,
      plainText: false,
    });

    expect(mockClient.post).toHaveBeenCalledWith(
      "/tasks/task-1/comments",
      null,
      expect.objectContaining({
        params: { text: mention },
      }),
    );
    const config = (mockClient.post as ReturnType<typeof vi.fn>).mock.calls[0][2] as {
      params: Record<string, string>;
    };
    expect(config.params).not.toHaveProperty("plainText");
  });

  it("sends plainText=true only for plain comments", async () => {
    const token = { accessToken: "tok", tokenType: "bearer" as const };

    await adapter.createComment(token, {
      taskId: "task-1",
      text: "hello",
      plainText: true,
    });

    expect(mockClient.post).toHaveBeenCalledWith(
      "/tasks/task-1/comments",
      null,
      expect.objectContaining({
        params: { text: "hello", plainText: "true" },
      }),
    );
  });
});
