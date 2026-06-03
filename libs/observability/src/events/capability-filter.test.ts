import { describe, expect, it } from "vitest";

import { shouldTrackEvent } from "./capability-filter";

describe("shouldTrackEvent", () => {
  it("passes events with no capability guard unconditionally", () => {
    expect(shouldTrackEvent("task.created", {})).toBe(true);
    expect(shouldTrackEvent("page.viewed", { hasComments: false })).toBe(true);
    expect(shouldTrackEvent("api.request", {})).toBe(true);
  });

  it("blocks comment.added when hasComments is false", () => {
    expect(shouldTrackEvent("comment.added", { hasComments: false })).toBe(false);
  });

  it("passes comment.added when hasComments is true", () => {
    expect(shouldTrackEvent("comment.added", { hasComments: true })).toBe(true);
  });

  it("passes comment.added when the flag is absent (undefined = not restricted)", () => {
    expect(shouldTrackEvent("comment.added", {})).toBe(true);
  });

  it("blocks attachment.uploaded when hasAttachments is false", () => {
    expect(shouldTrackEvent("attachment.uploaded", { hasAttachments: false })).toBe(false);
  });

  it("blocks ai_breakdown.generated when hasAiWorkBreakdown is false", () => {
    expect(shouldTrackEvent("ai_breakdown.generated", { hasAiWorkBreakdown: false })).toBe(false);
  });

  it("blocks task.status_changed when hasStatusTransitions is false", () => {
    expect(shouldTrackEvent("task.status_changed", { hasStatusTransitions: false })).toBe(false);
  });

  it("blocks site.selected when hasSites is false", () => {
    expect(shouldTrackEvent("site.selected", { hasSites: false })).toBe(false);
  });
});
