import type { AxiosError } from "axios";
import { describe, expect, it } from "vitest";

import { WrikeClientError } from "@/exceptions/wrikeErrors";
import {
  extractUpstreamError,
  formatPlatformErrorMessage,
  formatPlatformNetworkErrorMessage,
  throwPlatformClientError,
} from "@/lib/extractPlatformError";

describe("extractUpstreamError", () => {
  it("parses Wrike-style error envelope", () => {
    expect(
      extractUpstreamError({
        error: "invalid_parameter",
        errorDescription: "Parameter id is invalid",
      }),
    ).toEqual({
      message: "Parameter id is invalid",
      platformCode: "invalid_parameter",
    });
  });

  it("falls back when envelope is missing", () => {
    expect(extractUpstreamError(null)).toEqual({ message: "Bad request." });
  });
});

describe("formatPlatformErrorMessage", () => {
  it("returns retry-friendly message for 429", () => {
    expect(
      formatPlatformErrorMessage(
        { error: "too_many_requests", errorDescription: "Rate limit exceeded" },
        429,
      ),
    ).toEqual({
      message: "Too many requests to Wrike. Please wait a moment and try again.",
      platformCode: "too_many_requests",
    });
  });

  it("returns retry-friendly message for rate_limit_exceeded code", () => {
    expect(
      formatPlatformErrorMessage(
        { error: "rate_limit_exceeded", errorDescription: "Rate limit exceeded" },
        400,
      ),
    ).toEqual({
      message: "Too many requests to Wrike. Please wait a moment and try again.",
      platformCode: "rate_limit_exceeded",
    });
  });

  it("returns retry-friendly message for upstream 5xx", () => {
    expect(
      formatPlatformErrorMessage(
        { error: "server_error", errorDescription: "Internal server error" },
        503,
      ),
    ).toEqual({
      message: "Wrike is temporarily unavailable. Please try again in a few minutes.",
      platformCode: "server_error",
    });
  });

  it("passes through other client error descriptions", () => {
    expect(
      formatPlatformErrorMessage(
        { error: "resource_not_found", errorDescription: "Folder not found" },
        404,
      ),
    ).toEqual({
      message: "Folder not found",
      platformCode: "resource_not_found",
    });
  });
});

describe("formatPlatformNetworkErrorMessage", () => {
  it("returns timeout message for ECONNABORTED", () => {
    const error = { message: "timeout of 5000ms exceeded", code: "ECONNABORTED" } as AxiosError;
    expect(formatPlatformNetworkErrorMessage(error)).toBe(
      "Request to Wrike timed out. Please check your connection and try again.",
    );
  });

  it("returns reachability message for ENOTFOUND", () => {
    const error = { message: "getaddrinfo ENOTFOUND", code: "ENOTFOUND" } as AxiosError;
    expect(formatPlatformNetworkErrorMessage(error)).toBe(
      "Could not reach Wrike. Please check your connection and try again.",
    );
  });

  it("returns generic connect message for other network failures", () => {
    const error = { message: "Network Error", code: "ERR_NETWORK" } as AxiosError;
    expect(formatPlatformNetworkErrorMessage(error)).toBe(
      "Could not connect to Wrike. Please try again in a few minutes.",
    );
  });
});

describe("throwPlatformClientError", () => {
  it("throws WrikeClientError with mapped status and message", () => {
    expect(() =>
      throwPlatformClientError(
        { error: "too_many_requests", errorDescription: "Rate limit exceeded" },
        429,
      ),
    ).toThrow(WrikeClientError);

    try {
      throwPlatformClientError(
        { error: "too_many_requests", errorDescription: "Rate limit exceeded" },
        429,
      );
    } catch (error) {
      expect(error).toBeInstanceOf(WrikeClientError);
      expect((error as WrikeClientError).statusCode).toBe(429);
      expect((error as WrikeClientError).message).toBe(
        "Too many requests to Wrike. Please wait a moment and try again.",
      );
      expect((error as WrikeClientError).platformCode).toBe("too_many_requests");
    }
  });
});
