import { describe, expect, it } from "vitest";

import {
  hasWrikeFolderAccessFallback,
  hasWrikePermission,
  WRIKE_ACCESS_ROLE_FULL,
  WRIKE_PERMISSION_KEYS,
} from "@/platforms/wrike/wrikePermissions";

describe("hasWrikePermission", () => {
  it.each([
    ["Full", "BROWSE_PROJECTS", true],
    ["Full", "CREATE_ISSUES", true],
    ["Full", "EDIT_ISSUES", true],
    ["Full", "DELETE_ISSUES", true],
    ["Full", "ASSIGN_ISSUES", true],
    ["Full", "TRANSITION_ISSUES", true],
    ["Editor", "BROWSE_PROJECTS", true],
    ["Editor", "CREATE_ISSUES", true],
    ["Editor", "EDIT_ISSUES", true],
    ["Editor", "DELETE_ISSUES", false],
    ["Editor", "ASSIGN_ISSUES", true],
    ["Editor", "TRANSITION_ISSUES", true],
    ["Limited", "BROWSE_PROJECTS", true],
    ["Limited", "CREATE_ISSUES", true],
    ["Limited", "EDIT_ISSUES", true],
    ["Limited", "DELETE_ISSUES", false],
    ["Limited", "ASSIGN_ISSUES", false],
    ["Limited", "TRANSITION_ISSUES", true],
    ["Read Only", "BROWSE_PROJECTS", true],
    ["Read Only", "CREATE_ISSUES", false],
    ["Read Only", "EDIT_ISSUES", false],
    ["Read Only", "DELETE_ISSUES", false],
    ["Read Only", "ASSIGN_ISSUES", false],
    ["Read Only", "TRANSITION_ISSUES", false],
    ["Custom Role", "BROWSE_PROJECTS", false],
    ["Custom Role", "CREATE_ISSUES", false],
  ] as const)("role %s + %s => %s", (roleTitle, permission, expected) => {
    expect(hasWrikePermission(roleTitle, permission)).toBe(expected);
  });

  it("treats manager role title constant as full access", () => {
    for (const permission of WRIKE_PERMISSION_KEYS) {
      expect(hasWrikePermission(WRIKE_ACCESS_ROLE_FULL, permission)).toBe(true);
    }
  });

  it("normalizes role title casing", () => {
    expect(hasWrikePermission("read only", "BROWSE_PROJECTS")).toBe(true);
    expect(hasWrikePermission("READ ONLY", "CREATE_ISSUES")).toBe(false);
  });
});

describe("hasWrikeFolderAccessFallback", () => {
  it("grants Editor-like rights including create", () => {
    expect(hasWrikeFolderAccessFallback("CREATE_ISSUES")).toBe(true);
    expect(hasWrikeFolderAccessFallback("EDIT_ISSUES")).toBe(true);
    expect(hasWrikeFolderAccessFallback("ASSIGN_ISSUES")).toBe(true);
  });

  it("denies delete", () => {
    expect(hasWrikeFolderAccessFallback("DELETE_ISSUES")).toBe(false);
  });
});
