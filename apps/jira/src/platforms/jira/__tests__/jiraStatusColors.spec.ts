import { describe, expect, it } from "vitest";

import { jiraStatusColorToColorName, jiraStatusToPlatformStatus } from "../jiraStatusColors";

describe("jiraStatusColorToColorName", () => {
  it("maps Jira palette colors to badge color names", () => {
    expect(jiraStatusColorToColorName("blue-gray")).toBe("gray");
    expect(jiraStatusColorToColorName("yellow")).toBe("purple");
    expect(jiraStatusColorToColorName("green")).toBe("green");
  });

  it("passes through unmapped colors", () => {
    expect(jiraStatusColorToColorName("red")).toBe("red");
  });
});

describe("jiraStatusToPlatformStatus", () => {
  it("rewrites statusCategory.colorName using the Jira palette map", () => {
    expect(
      jiraStatusToPlatformStatus({
        id: "1",
        name: "In Progress",
        description: "",
        statusCategory: {
          id: "2",
          key: "indeterminate",
          name: "In Progress",
          colorName: "yellow",
        },
      }),
    ).toEqual({
      id: "1",
      name: "In Progress",
      statusCategory: {
        key: "indeterminate",
        name: "In Progress",
        colorName: "purple",
      },
    });
  });
});
