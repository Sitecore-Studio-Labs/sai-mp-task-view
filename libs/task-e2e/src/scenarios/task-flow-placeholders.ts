import { test } from "@playwright/test";

import type { PlatformTaskE2EHarness } from "../harness.contract";

const skipMessage = (area: string) =>
  `Set supportsTaskFlowMocks + installTaskFlowMocks on the platform harness to enable ${area} tests.`;

export function registerListIssuesPlaceholders(h: PlatformTaskE2EHarness): void {
  test.describe(`List tasks (${h.platformKey})`, () => {
    test("lists tasks for a selected project", async () => {
      test.skip(!h.supportsTaskFlowMocks, skipMessage("list issues"));
    });
    test("empty project shows empty state", async () => {
      test.skip(!h.supportsTaskFlowMocks, skipMessage("list issues"));
    });
    test("load failure shows error copy", async () => {
      test.skip(!h.supportsTaskFlowMocks, skipMessage("list issues"));
    });
  });
}

export function registerCreateIssuePlaceholders(h: PlatformTaskE2EHarness): void {
  test.describe(`Create issue (${h.platformKey})`, () => {
    test("creates an issue with required fields", async () => {
      test.skip(!h.supportsTaskFlowMocks, skipMessage("create issue"));
    });
  });
}

export function registerEditIssuePlaceholders(h: PlatformTaskE2EHarness): void {
  test.describe(`Edit issue (${h.platformKey})`, () => {
    test("updates fields on an existing issue", async () => {
      test.skip(!h.supportsTaskFlowMocks, skipMessage("edit issue"));
    });
  });
}

export function registerDeleteIssuePlaceholders(h: PlatformTaskE2EHarness): void {
  test.describe(`Delete issue (${h.platformKey})`, () => {
    test("deletes an issue after confirmation", async () => {
      test.skip(!h.supportsTaskFlowMocks, skipMessage("delete issue"));
    });
  });
}

export function registerIssueDetailsPlaceholders(h: PlatformTaskE2EHarness): void {
  test.describe(`Issue details (${h.platformKey})`, () => {
    test("opens details drawer with expected fields", async () => {
      test.skip(!h.supportsTaskFlowMocks, skipMessage("issue details"));
    });
  });
}
