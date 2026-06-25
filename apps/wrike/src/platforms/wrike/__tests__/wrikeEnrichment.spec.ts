import { describe, expect, it, vi } from "vitest";

import {
  loadWorkflowsForContext,
  resolveTaskPlatformStatus,
} from "@/platforms/wrike/wrikeEnrichment";
import type { WrikeHttpAdapter } from "@/platforms/wrike/WrikeHttpAdapter";
import type { WrikeCustomStatus, WrikeTask, WrikeWorkflow } from "@/types/wrike";

const spaceWorkflow: WrikeWorkflow = {
  id: "wf-space",
  name: "Space Workflow",
  customStatuses: [
    { id: "status-1", name: "In Review", standardName: "Active" },
    { id: "status-2", name: "Done", standardName: "Completed" },
  ],
};

describe("resolveTaskPlatformStatus", () => {
  const statusMap = new Map<string, WrikeCustomStatus>([
    ["status-1", { id: "status-1", name: "In Review", standardName: "Active" }],
  ]);

  it("returns the custom status name when customStatusId is in the map", () => {
    const raw: WrikeTask = { id: "task-1", customStatusId: "status-1", status: "Active" };

    expect(resolveTaskPlatformStatus(raw, statusMap)).toEqual({
      id: "status-1",
      name: "In Review",
      statusCategory: { key: "indeterminate", name: "In Progress" },
    });
  });

  it("falls back to built-in Wrike status when customStatusId is missing from the map", () => {
    const raw: WrikeTask = { id: "task-1", customStatusId: "missing", status: "Active" };

    expect(resolveTaskPlatformStatus(raw, statusMap).name).toBe("Active");
  });
});

describe("loadWorkflowsForContext", () => {
  it("loads space workflows first using the folder-to-space map", async () => {
    const folderToSpace = new Map([["proj-1", "space-1"]]);
    const getSpaceWorkflows = vi.fn().mockResolvedValue([spaceWorkflow]);
    const getWorkflows = vi.fn().mockResolvedValue([]);

    const adapter = {
      getSpaceWorkflows,
      getWorkflows,
      getFolder: vi.fn(),
      getSpaces: vi.fn(),
    } as unknown as WrikeHttpAdapter;

    const workflows = await loadWorkflowsForContext(
      adapter,
      { accessToken: "token", tokenType: "bearer" },
      ["proj-1"],
      folderToSpace,
    );

    expect(getSpaceWorkflows).toHaveBeenCalledWith(
      { accessToken: "token", tokenType: "bearer" },
      "space-1",
    );
    expect(getWorkflows).toHaveBeenCalled();
    expect(workflows).toEqual([spaceWorkflow]);
  });
});
