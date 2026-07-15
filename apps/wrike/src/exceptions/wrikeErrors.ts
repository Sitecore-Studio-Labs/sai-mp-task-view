import { PlatformApiError } from "@mp/task-core";

export class WrikeAuthError extends Error {
  constructor(message = "Wrike session has expired. Please reconnect Wrike.") {
    super(message);
    this.name = "WrikeAuthError";
  }
}

/** Thrown when Wrike API returns 4xx/5xx. Extends PlatformApiError for cross-platform catch blocks. */
export class WrikeClientError extends PlatformApiError {
  constructor(message: string, statusCode: number, platformCode?: string) {
    super(message, statusCode, platformCode);
    this.name = "WrikeClientError";
  }
}
