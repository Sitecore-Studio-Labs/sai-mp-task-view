import { afterEach, beforeEach, describe, expect, it } from "vitest";

import type { BaseExporter } from "../exporters/base";
import type { ObservabilityEvent } from "../types/events";
import { METRIC } from "../types/metrics";
import { ObservabilityClient } from "./client";

function makeExporter(): BaseExporter & { events: ObservabilityEvent[] } {
  const events: ObservabilityEvent[] = [];
  return {
    name: "test",
    events,
    export(event: ObservabilityEvent) {
      events.push(event);
    },
  };
}

describe("ObservabilityClient", () => {
  beforeEach(() => {
    ObservabilityClient._reset();
  });

  afterEach(() => {
    ObservabilityClient._reset();
  });

  it("returns the same instance on repeated calls", () => {
    const a = ObservabilityClient.getInstance();
    const b = ObservabilityClient.getInstance();
    expect(a).toBe(b);
  });

  it("drops track() calls before init()", () => {
    const exporter = makeExporter();
    ObservabilityClient.getInstance().track({
      eventName: METRIC.PAGE_VIEWED,
      category: "page",
      properties: {},
    });
    expect(exporter.events).toHaveLength(0);
  });

  it("dispatches events to all registered exporters after init()", () => {
    const exp1 = makeExporter();
    const exp2 = makeExporter();
    const client = ObservabilityClient.getInstance();
    client.init({ exporters: [exp1, exp2], platform: "test", appVersion: "1.0.0" });

    client.track({
      eventName: METRIC.TASK_CREATED,
      category: "business",
      properties: { issueType: "Story" },
    });

    expect(exp1.events).toHaveLength(1);
    expect(exp2.events).toHaveLength(1);
    expect(exp1.events[0].eventName).toBe(METRIC.TASK_CREATED);
    expect(exp1.events[0].platform).toBe("test");
  });

  it("auto-fills platform, appVersion, timestamp, sessionId", () => {
    const exporter = makeExporter();
    const client = ObservabilityClient.getInstance();
    client.init({ exporters: [exporter], platform: "jira", appVersion: "2.0.0" });
    client.track({ eventName: METRIC.PAGE_VIEWED, category: "page", properties: {} });

    const event = exporter.events[0];
    expect(event.platform).toBe("jira");
    expect(event.appVersion).toBe("2.0.0");
    expect(typeof event.timestamp).toBe("number");
    expect(typeof event.sessionId).toBe("string");
  });

  it("filters events when capability flag is false", () => {
    const exporter = makeExporter();
    const client = ObservabilityClient.getInstance();
    client.init({ exporters: [exporter], platform: "test" });

    client.track(
      { eventName: "comment.added", category: "business", properties: {} },
      { hasComments: false },
    );

    expect(exporter.events).toHaveLength(0);
  });

  it("passes events when capability flag is true", () => {
    const exporter = makeExporter();
    const client = ObservabilityClient.getInstance();
    client.init({ exporters: [exporter], platform: "test" });

    client.track(
      { eventName: "comment.added", category: "business", properties: {} },
      { hasComments: true },
    );

    expect(exporter.events).toHaveLength(1);
  });

  it("swallows exporter errors without surfacing them", () => {
    const broken: BaseExporter = {
      name: "broken",
      export: () => {
        throw new Error("exporter failure");
      },
    };
    const client = ObservabilityClient.getInstance();
    client.init({ exporters: [broken], platform: "test" });

    expect(() =>
      client.track({ eventName: METRIC.PAGE_VIEWED, category: "page", properties: {} }),
    ).not.toThrow();
  });

  it("trackError emits an error-category event with errorMessage property", () => {
    const exporter = makeExporter();
    const client = ObservabilityClient.getInstance();
    client.init({ exporters: [exporter], platform: "test" });

    const err = new Error("something went wrong");
    client.trackError(METRIC.UNHANDLED_ERROR, err);

    expect(exporter.events[0].category).toBe("error");
    expect(exporter.events[0].properties["errorMessage"]).toBe("something went wrong");
  });
});
