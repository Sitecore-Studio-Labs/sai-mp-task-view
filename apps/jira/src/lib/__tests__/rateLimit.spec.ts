import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getClientKey, rateLimit } from "../rateLimit";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("rateLimit", () => {
  it("allows requests under the limit", () => {
    vi.setSystemTime(0);
    const key = "test-allow";
    for (let i = 0; i < 5; i++) {
      expect(rateLimit(key, 5, 60_000).allowed).toBe(true);
    }
  });

  it("blocks the request that exceeds the limit", () => {
    vi.setSystemTime(1_000);
    const key = "test-block";
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 60_000);
    const result = rateLimit(key, 3, 60_000);
    expect(result.allowed).toBe(false);
    expect(result.retryAfter).toBeGreaterThan(0);
  });

  it("allows again after the window expires", () => {
    vi.setSystemTime(2_000);
    const key = "test-window";
    for (let i = 0; i < 3; i++) rateLimit(key, 3, 60_000);
    expect(rateLimit(key, 3, 60_000).allowed).toBe(false);

    vi.setSystemTime(2_000 + 60_001);
    expect(rateLimit(key, 3, 60_000).allowed).toBe(true);
  });

  it("returns retryAfter 0 when allowed", () => {
    vi.setSystemTime(3_000);
    expect(rateLimit("test-retry-zero", 10, 60_000).retryAfter).toBe(0);
  });
});

describe("getClientKey", () => {
  it("extracts the first IP from x-forwarded-for", () => {
    const req = new Request("http://localhost", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8" },
    });
    expect(getClientKey(req)).toBe("1.2.3.4");
  });

  it("returns 'unknown' when header is absent", () => {
    const req = new Request("http://localhost");
    expect(getClientKey(req)).toBe("unknown");
  });
});
