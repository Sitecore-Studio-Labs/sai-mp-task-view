import { describe, expect, it } from "vitest";

import { resolveStatusBadgeColorScheme } from "./statusCategoryColors";

/** PlatformStatus shapes emitted by Wrike adapter for typical workflow labels. */
const WRIKE_WORKFLOW_STATUS_FIXTURES = [
  {
    label: "New",
    status: {
      id: "status-new",
      name: "New",
      statusCategory: { key: "indeterminate", name: "In Progress", colorName: "gray" },
    },
    badgeColor: "neutral",
  },
  {
    label: "In Progress",
    status: {
      id: "status-progress",
      name: "In Progress",
      statusCategory: { key: "indeterminate", name: "In Progress", colorName: "sky" },
    },
    badgeColor: "sky",
  },
  {
    label: "Completed",
    status: {
      id: "status-done",
      name: "Completed",
      statusCategory: { key: "done", name: "Done", colorName: "green" },
    },
    badgeColor: "success",
  },
  {
    label: "On Hold",
    status: {
      id: "status-hold",
      name: "On Hold",
      statusCategory: { key: "new", name: "Deferred", colorName: "orange" },
    },
    badgeColor: "warning",
  },
  {
    label: "Cancelled",
    status: {
      id: "status-cancelled",
      name: "Cancelled",
      statusCategory: { key: "undefined", name: "Cancelled", colorName: "red" },
    },
    badgeColor: "danger",
  },
] as const;

/** Semantic fallback when Wrike adapter omits colorName (no workflow color configured). */
const WRIKE_SEMANTIC_FALLBACK_FIXTURES = [
  {
    label: "New",
    statusCategory: { key: "indeterminate", name: "In Progress" },
    badgeColor: "primary",
  },
  { label: "On Hold", statusCategory: { key: "new", name: "Deferred" }, badgeColor: "neutral" },
  {
    label: "Cancelled",
    statusCategory: { key: "undefined", name: "Cancelled" },
    badgeColor: "danger",
  },
] as const;

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

  it("prefers colorName over category key", () => {
    expect(
      resolveStatusBadgeColorScheme({
        id: "x",
        name: "Custom",
        statusCategory: { key: "custom", colorName: "purple" },
      }),
    ).toBe("primary");
  });

  it.each(WRIKE_WORKFLOW_STATUS_FIXTURES)(
    "uses Wrike workflow colorName for $label before semantic category fallback",
    ({ status, badgeColor }) => {
      expect(resolveStatusBadgeColorScheme(status)).toBe(badgeColor);
    },
  );

  it.each(WRIKE_SEMANTIC_FALLBACK_FIXTURES)(
    "falls back to semantic category color for Wrike $label when colorName is absent",
    ({ label, statusCategory, badgeColor }) => {
      expect(
        resolveStatusBadgeColorScheme({
          id: `status-${label.toLowerCase().replace(/\s+/g, "-")}`,
          name: label,
          statusCategory,
        }),
      ).toBe(badgeColor);
    },
  );

  it("returns neutral when status is missing", () => {
    expect(resolveStatusBadgeColorScheme(undefined)).toBe("neutral");
  });
});
