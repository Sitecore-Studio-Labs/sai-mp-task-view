/**
 * Smoke test: verifies the full observability pipeline works end-to-end
 * without errors — from factory → client → exporter.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import { ObservabilityClient } from "./core/client";
import { createObservabilityClient } from "./createObservabilityClient";
import { ConsoleExporter } from "./exporters/console";
import { METRIC } from "./types/metrics";

describe("Observability smoke test", () => {
  afterEach(() => {
    ObservabilityClient._reset();
  });

  it("initialises via factory and tracks an event without throwing", () => {
    // Suppress console output in tests
    vi.spyOn(console, "log").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});

    const client = createObservabilityClient({
      platform: "test-smoke",
      appVersion: "0.0.1",
      exporters: [new ConsoleExporter()],
    });

    expect(() => {
      client.track({
        eventName: METRIC.PAGE_VIEWED,
        category: "page",
        properties: { page: "smoke" },
      });
      client.track({
        eventName: METRIC.TASK_CREATED,
        category: "business",
        properties: { issueType: "Task" },
      });
      client.track({
        eventName: METRIC.API_REQUEST,
        category: "api",
        duration: 150,
        properties: { endpoint: "test", method: "GET", statusCode: 200 },
      });
    }).not.toThrow();

    vi.restoreAllMocks();
  });

  it("does not throw when no exporters are configured", () => {
    const client = createObservabilityClient({
      platform: "empty",
      exporters: [],
    });

    expect(() =>
      client.track({ eventName: METRIC.PAGE_VIEWED, category: "page", properties: {} }),
    ).not.toThrow();
  });

  it("creates a working span that can be ended without throwing", () => {
    createObservabilityClient({ platform: "span-test", exporters: [] });
    const client = ObservabilityClient.getInstance();

    const span = client.startSpan("test-span", { key: "value" });
    expect(() => {
      span.setAttribute("foo", "bar");
      span.setStatus("ok");
      span.end();
    }).not.toThrow();
  });
});
