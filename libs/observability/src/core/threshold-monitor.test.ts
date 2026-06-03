import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { BaseExporter } from "../exporters/base";
import type { ObservabilityEvent } from "../types/events";
import { METRIC } from "../types/metrics";
import { ObservabilityClient } from "./client";
import { ThresholdMonitor } from "./threshold-monitor";

function makeExporter(): BaseExporter & { events: ObservabilityEvent[] } {
  const events: ObservabilityEvent[] = [];
  return { name: "test", events, export: (e) => events.push(e) };
}

describe("ThresholdMonitor", () => {
  let exporter: ReturnType<typeof makeExporter>;

  beforeEach(() => {
    ObservabilityClient._reset();
    ThresholdMonitor._reset();
    exporter = makeExporter();
    ObservabilityClient.getInstance().init({ exporters: [exporter], platform: "test" });
  });

  afterEach(() => {
    ObservabilityClient._reset();
    ThresholdMonitor._reset();
  });

  it("returns the same instance on repeated calls", () => {
    expect(ThresholdMonitor.getInstance()).toBe(ThresholdMonitor.getInstance());
  });

  it("fires ALERT_THRESHOLD_EXCEEDED when error count exceeds maxErrors", () => {
    const monitor = ThresholdMonitor.getInstance();
    monitor.configure({ maxErrors: 3, windowMs: 60_000 });

    for (let i = 0; i < 3; i++) {
      monitor.record(METRIC.ERROR_BOUNDARY_TRIGGERED);
    }

    const alertEvents = exporter.events.filter(
      (e) => e.eventName === METRIC.ALERT_THRESHOLD_EXCEEDED,
    );
    expect(alertEvents.length).toBeGreaterThanOrEqual(1);
    expect(alertEvents[0].properties["metric"]).toBe(METRIC.ERROR_BOUNDARY_TRIGGERED);
  });

  it("does not fire alert below threshold", () => {
    const monitor = ThresholdMonitor.getInstance();
    monitor.configure({ maxErrors: 10, windowMs: 60_000 });

    for (let i = 0; i < 5; i++) {
      monitor.record(METRIC.ERROR_BOUNDARY_TRIGGERED);
    }

    const alertEvents = exporter.events.filter(
      (e) => e.eventName === METRIC.ALERT_THRESHOLD_EXCEEDED,
    );
    expect(alertEvents).toHaveLength(0);
  });

  it("fires alert when API error rate exceeds maxApiErrorRate", () => {
    const monitor = ThresholdMonitor.getInstance();
    monitor.configure({ maxApiErrorRate: 0.1 });

    // 10 requests, 5 errors = 50% error rate > 10%
    for (let i = 0; i < 10; i++) monitor.record(METRIC.API_REQUEST);
    for (let i = 0; i < 5; i++) monitor.record(METRIC.API_ERROR);

    const alertEvents = exporter.events.filter(
      (e) => e.eventName === METRIC.ALERT_THRESHOLD_EXCEEDED,
    );
    expect(alertEvents.length).toBeGreaterThanOrEqual(1);
    expect(alertEvents[0].properties["metric"]).toBe("api.error_rate");
  });

  it("resets buckets after alerting to prevent alert storms", () => {
    const monitor = ThresholdMonitor.getInstance();
    monitor.configure({ maxErrors: 2, windowMs: 60_000 });

    // Trigger first alert
    for (let i = 0; i < 2; i++) monitor.record(METRIC.ERROR_BOUNDARY_TRIGGERED);
    const countAfterFirst = exporter.events.filter(
      (e) => e.eventName === METRIC.ALERT_THRESHOLD_EXCEEDED,
    ).length;

    // One more event should not immediately re-alert (bucket was reset to 1)
    monitor.record(METRIC.ERROR_BOUNDARY_TRIGGERED);
    const countAfterOne = exporter.events.filter(
      (e) => e.eventName === METRIC.ALERT_THRESHOLD_EXCEEDED,
    ).length;

    expect(countAfterFirst).toBe(1);
    expect(countAfterOne).toBe(1); // no second alert yet
  });
});
