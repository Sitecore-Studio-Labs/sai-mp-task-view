import { normalizeWorkBreakdown, type RawWorkItem, validateAndNormalize } from "@mp/ai";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => {
  vi.spyOn(Date, "now").mockReturnValue(1700000000000);
  vi.spyOn(Math, "random").mockReturnValue(0.123456789);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const expectedId = `wb_${(1700000000000).toString(36)}_${(0.123456789).toString(36).slice(2, 9)}`;

describe("normalizeWorkBreakdown function", () => {
  it("should assign temp IDs if missing and keep existing IDs", () => {
    const rawItems: RawWorkItem[] = [
      { type: "epic", title: "Epic 1", description: "Desc" },
      { type: "story", id: "custom_id", title: "Story 1", description: "Desc" },
    ];

    const result = normalizeWorkBreakdown(rawItems, { draftId: "draft123" });

    expect(result.items.length).toBe(2);
    expect(result.items[0].id).toBe(expectedId);
    expect(result.items[1].id).toBe("custom_id");
  });

  it("should normalize nested children recursively", () => {
    const rawItems: RawWorkItem[] = [
      {
        type: "epic",
        title: "Epic 1",
        description: "Desc",
        children: [
          { type: "story", title: "Story 1", description: "Story Desc" },
          { type: "task", id: "task1", title: "Task 1", description: "" },
        ],
      },
    ];

    const result = normalizeWorkBreakdown(rawItems, { draftId: "draft123" });

    const epic = result.items[0];
    expect(epic.children.length).toBe(2);
    expect(epic.children[0].id).toBe(expectedId);
    expect(epic.children[1].id).toBe("task1");
  });

  it("should trim title and default to 'Untitled' if empty", () => {
    const rawItems: RawWorkItem[] = [{ type: "task", title: "   ", description: "Desc" }];

    const result = normalizeWorkBreakdown(rawItems, { draftId: "draft123" });
    expect(result.items[0].title).toBe("Untitled");
  });

  it("should preserve metadata if present", () => {
    const rawItems: RawWorkItem[] = [
      { type: "story", title: "Story", description: "Desc", metadata: { priority: "high" } },
    ];

    const result = normalizeWorkBreakdown(rawItems, { draftId: "draft123" });
    expect(result.items[0].metadata).toEqual({ priority: "high" });
  });

  it("should include timestamps and draft status", () => {
    const rawItems: RawWorkItem[] = [{ type: "task", title: "Task", description: "" }];
    const result = normalizeWorkBreakdown(rawItems, { draftId: "draft123", platform: "web" });

    expect(result.status).toBe("draft");
    expect(result.platform).toBe("web");
    expect(typeof result.createdAt).toBe("string");
    expect(typeof result.updatedAt).toBe("string");
  });
});

describe("validateAndNormalize function", () => {
  it("should throw error if no items present", () => {
    expect(() => validateAndNormalize({}, "draft123")).toThrow(
      "AI output must contain at least one top-level item.",
    );
  });

  it("should default to empty array if items is not an array", () => {
    const parsed = { items: undefined };
    expect(() => validateAndNormalize(parsed, "draft123")).toThrow(
      "AI output must contain at least one top-level item.",
    );
  });

  it("should normalize when items are present", () => {
    const parsed: { items: RawWorkItem[] } = {
      items: [{ type: "task", title: "Task", description: "" }],
    };

    const result = validateAndNormalize(parsed, "draft123", "PROJ1", "web");

    expect(result.id).toBe("draft123");
    expect(result.projectKey).toBe("PROJ1");
    expect(result.items[0].title).toBe("Task");
  });
});
