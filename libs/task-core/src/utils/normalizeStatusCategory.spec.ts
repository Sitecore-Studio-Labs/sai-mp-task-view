import { describe, expect, it } from "vitest";

import { normalizeStatusCategoryKey } from "./normalizeStatusCategory";

describe("normalizeStatusCategoryKey", () => {
  it("passes through Jira canonical keys", () => {
    expect(normalizeStatusCategoryKey("indeterminate")).toBe("indeterminate");
    expect(normalizeStatusCategoryKey("done")).toBe("done");
  });

  it("maps Wrike standardName values", () => {
    expect(normalizeStatusCategoryKey("Active", { source: "wrike" })).toBe("indeterminate");
    expect(normalizeStatusCategoryKey("Completed", { source: "wrike" })).toBe("done");
    expect(normalizeStatusCategoryKey("Cancelled", { source: "wrike" })).toBe("undefined");
  });

  it("heuristically maps common label patterns", () => {
    expect(normalizeStatusCategoryKey("In Progress")).toBe("indeterminate");
    expect(normalizeStatusCategoryKey("Done")).toBe("done");
  });
});
