import type { AxiosError } from "axios";

import { WrikeClientError } from "@/exceptions/wrikeErrors";

const RATE_LIMIT_CODES = new Set(["too_many_requests", "rate_limit_exceeded"]);

/**
 * Parses Wrike's structured error response body.
 * Wrike returns: { errorDescription: string, error: string }
 */
export function extractWrikeError(responseData: unknown): {
  message: string;
  platformCode?: string;
} {
  if (responseData == null || typeof responseData !== "object") {
    return { message: "Bad request." };
  }

  const d = responseData as {
    errorDescription?: string;
    error?: string;
  };

  const platformCode = typeof d.error === "string" ? d.error : undefined;
  const description =
    typeof d.errorDescription === "string" && d.errorDescription.trim().length > 0
      ? d.errorDescription
      : undefined;

  return {
    message: description ?? platformCode ?? "Bad request.",
    platformCode,
  };
}

/**
 * Maps Wrike upstream failures to user-friendly messages, especially for retryable cases.
 */
export function formatWrikeErrorMessage(
  responseData: unknown,
  statusCode: number,
): { message: string; platformCode?: string } {
  const { message, platformCode } = extractWrikeError(responseData);

  if (statusCode === 429 || (platformCode && RATE_LIMIT_CODES.has(platformCode))) {
    return {
      message: "Too many requests to Wrike. Please wait a moment and try again.",
      platformCode,
    };
  }

  if (statusCode >= 500) {
    return {
      message: "Wrike is temporarily unavailable. Please try again in a few minutes.",
      platformCode,
    };
  }

  return { message, platformCode };
}

/**
 * Maps Axios network/timeout failures (no HTTP response) to user-friendly messages.
 */
export function formatWrikeNetworkErrorMessage(error: AxiosError): string {
  const code = error.code;
  if (code === "ECONNABORTED" || error.message.toLowerCase().includes("timeout")) {
    return "Request to Wrike timed out. Please check your connection and try again.";
  }
  if (code === "ENOTFOUND" || code === "ECONNREFUSED") {
    return "Could not reach Wrike. Please check your connection and try again.";
  }
  return "Could not connect to Wrike. Please try again in a few minutes.";
}

/**
 * Throws a WrikeClientError with a parsed Wrike error message.
 * Use in WrikeAdapter catch blocks or the Axios response interceptor.
 */
export function throwWrikeApiError(responseData: unknown, statusCode: number): never {
  const { message, platformCode } = formatWrikeErrorMessage(responseData, statusCode);
  throw new WrikeClientError(message, statusCode, platformCode);
}
