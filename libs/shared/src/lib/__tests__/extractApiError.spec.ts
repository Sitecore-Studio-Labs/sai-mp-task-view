import { AxiosError } from "axios";
import { describe, expect, it } from "vitest";

import { extractApiError } from "../extractApiError";

const createAxiosError = (data?: unknown, status = 400) =>
  new AxiosError("Request failed", "ERR_BAD_REQUEST", undefined, undefined, {
    status,
    data,
    statusText: "Bad Request",
    headers: {},
    config: {} as never,
  });

describe("extractApiError", () => {
  it("returns the BFF error string from an Axios response", () => {
    const err = createAxiosError({ error: "Project not found" });

    expect(extractApiError(err)).toBe("Project not found");
  });

  it("uses the Axios error message when response has no string error field", () => {
    const err = createAxiosError({ error: 404 });

    expect(extractApiError(err)).toBe("Request failed");
  });

  it("uses the Axios error message when there is no response", () => {
    const err = new AxiosError("Network Error", "ERR_NETWORK");

    expect(extractApiError(err)).toBe("Network Error");
  });

  it("returns the message from a standard Error", () => {
    expect(extractApiError(new Error("Validation failed"))).toBe("Validation failed");
  });

  it("returns the provided fallback for unknown values", () => {
    expect(extractApiError("boom")).toBe("An unexpected error occurred.");
    expect(extractApiError(null, "Custom fallback")).toBe("Custom fallback");
  });
});
