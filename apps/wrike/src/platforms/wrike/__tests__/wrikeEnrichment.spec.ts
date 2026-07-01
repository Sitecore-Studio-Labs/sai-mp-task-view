import { describe, expect, it, vi } from "vitest";

import {
  findMissingCustomStatusIds,
  loadWorkflowsForContext,
  resolveTaskPlatformStatus,
  supplementStatusMapFromAllSpaces,
  workflowsToProjectStatuses,
  workflowsToTransitions,
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

  it("surfaces unresolved customStatusId when it is missing from the map", () => {
    const raw: WrikeTask = { id: "task-1", customStatusId: "missing", status: "Active" };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    expect(resolveTaskPlatformStatus(raw, statusMap)).toEqual({
      id: "missing",
      name: "missing",
      statusCategory: { key: "indeterminate", name: "In Progress" },
    });
    expect(warn).toHaveBeenCalledWith(
      "[wrikeEnrichment] Unresolved custom status for task task-1: customStatusId=missing, builtInStatus=Active",
    );

    warn.mockRestore();
  });

  it("uses built-in Wrike status when task has no customStatusId", () => {
    const raw: WrikeTask = { id: "task-1", status: "Active" };

    expect(resolveTaskPlatformStatus(raw, statusMap).name).toBe("Active");
  });
});

describe("findMissingCustomStatusIds", () => {
  it("returns customStatusIds not present in the status map", () => {
    const statusMap = new Map<string, WrikeCustomStatus>([
      ["status-1", { id: "status-1", name: "Open", standardName: "Active" }],
    ]);
    const tasks: WrikeTask[] = [
      { id: "task-1", customStatusId: "status-1" },
      { id: "task-2", customStatusId: "status-missing" },
      { id: "task-3", status: "Active" },
    ];

    expect(findMissingCustomStatusIds(tasks, statusMap)).toEqual(["status-missing"]);
  });
});

describe("supplementStatusMapFromAllSpaces", () => {
  it("merges custom statuses from all space workflows when primary load missed them", async () => {
    const statusMap = new Map<string, WrikeCustomStatus>();
    const getSpaces = vi.fn().mockResolvedValue([{ id: "space-1", title: "Space" }]);
    const getSpaceWorkflows = vi.fn().mockResolvedValue([
      {
        id: "wf-1",
        name: "Workflow",
        customStatuses: [{ id: "status-missing", name: "In Review", standardName: "Active" }],
      },
    ]);
    const adapter = { getSpaces, getSpaceWorkflows } as unknown as WrikeHttpAdapter;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);

    await supplementStatusMapFromAllSpaces(
      adapter,
      { accessToken: "token", tokenType: "bearer" },
      statusMap,
      ["status-missing"],
    );

    expect(getSpaceWorkflows).toHaveBeenCalled();
    expect(statusMap.get("status-missing")?.name).toBe("In Review");
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining("missing after primary workflow load"),
    );

    warn.mockRestore();
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

describe("workflowsToProjectStatuses", () => {
  it("excludes hidden workflows and hidden custom statuses", () => {
    const groups = workflowsToProjectStatuses([
      spaceWorkflow,
      {
        id: "wf-deleted",
        name: "Deleted Workflow",
        hidden: true,
        customStatuses: [{ id: "status-x", name: "Archived", standardName: "Completed" }],
      },
      {
        id: "wf-mixed",
        name: "Mixed Workflow",
        customStatuses: [
          { id: "status-visible", name: "Open", standardName: "Active" },
          { id: "status-hidden", name: "Old Step", standardName: "Active", hidden: true },
        ],
      },
    ]);

    expect(groups.map((group) => group.id).sort()).toEqual(["wf-mixed", "wf-space"]);
    expect(groups.find((group) => group.id === "wf-mixed")?.statuses).toEqual([
      {
        id: "status-visible",
        name: "Open",
        statusCategory: { key: "indeterminate", name: "In Progress" },
      },
    ]);
  });
});

describe("workflowsToTransitions", () => {
  it("excludes hidden workflows and hidden custom statuses", () => {
    const transitions = workflowsToTransitions([
      {
        id: "wf-deleted",
        name: "Deleted Workflow",
        hidden: true,
        customStatuses: [{ id: "status-x", name: "Archived", standardName: "Completed" }],
      },
      {
        id: "wf-active",
        name: "Active Workflow",
        customStatuses: [
          { id: "status-visible", name: "Open", standardName: "Active" },
          { id: "status-hidden", name: "Old Step", standardName: "Active", hidden: true },
        ],
      },
    ]);

    expect(transitions).toEqual([
      {
        id: "status-visible",
        name: "Open",
        to: {
          id: "status-visible",
          name: "Open",
          statusCategory: { key: "indeterminate", name: "In Progress" },
        },
      },
    ]);
  });
});
