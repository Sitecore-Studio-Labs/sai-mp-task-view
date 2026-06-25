import { describe, expect, it } from "vitest";

import { resolveStatusBadgeColorScheme } from "./statusCategoryColors";

describe("resolveStatusBadgeColorScheme", () => {
  it("maps Jira category keys to pre-release badge colors", () => {
    expect(
      resolveStatusBadgeColorScheme({
        id: "1",
        name: "To Do",
        statusCategory: { key: "new" },
      }),
    ).toBe("neutral");

    expect(
      resolveStatusBadgeColorScheme({
        id: "2",
        name: "In Progress",
        statusCategory: { key: "indeterminate" },
      }),
    ).toBe("primary");

    expect(
      resolveStatusBadgeColorScheme({
        id: "3",
        name: "Done",
        statusCategory: { key: "done" },
      }),
    ).toBe("success");
  });

  it("falls back to colorName when key is unknown", () => {
    expect(
      resolveStatusBadgeColorScheme({
        id: "x",
        name: "Custom",
        statusCategory: { key: "custom", colorName: "purple" },
      }),
    ).toBe("primary");
  });

  it("returns neutral when status is missing", () => {
    expect(resolveStatusBadgeColorScheme(undefined)).toBe("neutral");
  });
});
