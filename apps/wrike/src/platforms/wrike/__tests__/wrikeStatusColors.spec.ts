import { describe, expect, it } from "vitest";

import { customStatusToPlatformStatus } from "@/platforms/wrike/wrikeEnrichment";
import type { WrikeCustomStatus } from "@/types/wrike";

import {
  buildWrikeCustomStatusCategory,
  wrikeStandardNameToCategory,
  wrikeStatusColorToColorName,
} from "../wrikeStatusColors";

/** Committed Wrike workflow palette → StatusBadge colorName map (see wrikeStatusColors.ts). */
const WRIKE_STATUS_COLOR_FIXTURES = [
  { wrikeColor: "DarkRed", colorName: "red" },
  { wrikeColor: "red", colorName: "pink" },
  { wrikeColor: "Purple", colorName: "purple" },
  { wrikeColor: "Indigo", colorName: "indigo" },
  { wrikeColor: "DarkBlue", colorName: "blue" },
  { wrikeColor: "Blue", colorName: "sky" },
  { wrikeColor: "Turquoise", colorName: "cyan" },
  { wrikeColor: "DarkCyan", colorName: "teal" },
  { wrikeColor: "Green", colorName: "green" },
  { wrikeColor: "YellowGreen", colorName: "lime" },
  { wrikeColor: "Yellow", colorName: "yellow" },
  { wrikeColor: "Orange", colorName: "orange" },
  { wrikeColor: "Brown", colorName: "stone" },
  { wrikeColor: "Gray", colorName: "gray" },
] as const;

/** Committed Wrike standardName → platform statusCategory map (see wrikeStatusColors.ts). */
const WRIKE_STANDARD_NAME_CATEGORY_FIXTURES = [
  {
    standardName: "Active",
    statusCategory: { key: "indeterminate", name: "In Progress" },
  },
  {
    standardName: "Completed",
    statusCategory: { key: "done", name: "Done" },
  },
  {
    standardName: "Deferred",
    statusCategory: { key: "new", name: "Deferred" },
  },
  {
    standardName: "Cancelled",
    statusCategory: { key: "undefined", name: "Cancelled" },
  },
] as const satisfies ReadonlyArray<{
  standardName: WrikeCustomStatus["standardName"];
  statusCategory: { key: string; name: string };
}>;

/**
 * Typical Wrike workflow step labels. Labels are admin-configured; standardName is the API
 * grouping used for semantic fallback when no workflow color is set.
 *
 * Badge color resolution (colorName before category key) is covered in
 * libs/ui/src/constants/statusCategoryColors.spec.ts.
 */
const WRIKE_WORKFLOW_LABEL_FIXTURES = [
  {
    label: "New",
    status: {
      id: "status-new",
      name: "New",
      standardName: "Active",
      color: "Gray",
    } satisfies WrikeCustomStatus,
    statusCategory: {
      key: "indeterminate",
      name: "In Progress",
      colorName: "gray",
    },
  },
  {
    label: "In Progress",
    status: {
      id: "status-progress",
      name: "In Progress",
      standardName: "Active",
      color: "Blue",
    } satisfies WrikeCustomStatus,
    statusCategory: {
      key: "indeterminate",
      name: "In Progress",
      colorName: "sky",
    },
  },
  {
    label: "Completed",
    status: {
      id: "status-done",
      name: "Completed",
      standardName: "Completed",
      color: "Green",
    } satisfies WrikeCustomStatus,
    statusCategory: {
      key: "done",
      name: "Done",
      colorName: "green",
    },
  },
  {
    label: "On Hold",
    status: {
      id: "status-hold",
      name: "On Hold",
      standardName: "Deferred",
      color: "Orange",
    } satisfies WrikeCustomStatus,
    statusCategory: {
      key: "new",
      name: "Deferred",
      colorName: "orange",
    },
  },
  {
    label: "Cancelled",
    status: {
      id: "status-cancelled",
      name: "Cancelled",
      standardName: "Cancelled",
      color: "DarkRed",
    } satisfies WrikeCustomStatus,
    statusCategory: {
      key: "undefined",
      name: "Cancelled",
      colorName: "red",
    },
  },
] as const;

/** Semantic statusCategory when Wrike workflow color is not configured. */
const WRIKE_SEMANTIC_FALLBACK_FIXTURES = [
  {
    label: "New",
    standardName: "Active",
    statusCategory: { key: "indeterminate", name: "In Progress" },
  },
  {
    label: "On Hold",
    standardName: "Deferred",
    statusCategory: { key: "new", name: "Deferred" },
  },
  {
    label: "Cancelled",
    standardName: "Cancelled",
    statusCategory: { key: "undefined", name: "Cancelled" },
  },
] as const satisfies ReadonlyArray<{
  label: string;
  standardName: WrikeCustomStatus["standardName"];
  statusCategory: { key: string; name: string };
}>;

describe("wrikeStatusColorToColorName", () => {
  it.each(WRIKE_STATUS_COLOR_FIXTURES)(
    "maps Wrike palette color $wrikeColor to badge colorName $colorName",
    ({ wrikeColor, colorName }) => {
      expect(wrikeStatusColorToColorName(wrikeColor)).toBe(colorName);
    },
  );

  it("returns undefined for missing or unknown colors", () => {
    expect(wrikeStatusColorToColorName(undefined)).toBeUndefined();
    expect(wrikeStatusColorToColorName("")).toBeUndefined();
    expect(wrikeStatusColorToColorName("magenta")).toBeUndefined();
  });

  it("normalizes casing and surrounding whitespace", () => {
    expect(wrikeStatusColorToColorName("  DarkBlue  ")).toBe("blue");
  });
});

describe("wrikeStandardNameToCategory", () => {
  it.each(WRIKE_STANDARD_NAME_CATEGORY_FIXTURES)(
    "maps Wrike standardName $standardName to statusCategory $statusCategory.name",
    ({ standardName, statusCategory }) => {
      expect(wrikeStandardNameToCategory(standardName)).toEqual(statusCategory);
    },
  );
});

describe("buildWrikeCustomStatusCategory", () => {
  it.each(WRIKE_WORKFLOW_LABEL_FIXTURES)(
    "attaches workflow colorName for $label",
    ({ status, statusCategory }) => {
      expect(buildWrikeCustomStatusCategory(status)).toEqual(statusCategory);
    },
  );

  it.each(WRIKE_SEMANTIC_FALLBACK_FIXTURES)(
    "omits colorName for $label when workflow color is absent",
    ({ standardName, statusCategory }) => {
      expect(buildWrikeCustomStatusCategory({ standardName })).toEqual(statusCategory);
      expect(buildWrikeCustomStatusCategory({ standardName }).colorName).toBeUndefined();
    },
  );
});

describe("customStatusToPlatformStatus", () => {
  it.each(WRIKE_WORKFLOW_LABEL_FIXTURES)(
    "maps $label to platform status with workflow colorName attached",
    ({ status, statusCategory }) => {
      expect(customStatusToPlatformStatus(status)).toEqual({
        id: status.id,
        name: status.name,
        statusCategory,
      });
    },
  );
});
