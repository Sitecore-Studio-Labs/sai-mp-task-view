import { describe, expect, it } from "vitest";

import { extractUniqueStatuses, groupStatusesByWorkflow } from "./projectStatuses";

describe("groupStatusesByWorkflow", () => {
  it("groups statuses under workflow names", () => {
    const groups = groupStatusesByWorkflow([
      {
        id: "wf-1",
        name: "Default Workflow",
        statuses: [{ id: "s-1", name: "To Do", statusCategory: { key: "new", name: "New" } }],
      },
      {
        id: "wf-2",
        name: "Support Workflow",
        statuses: [
          {
            id: "s-2",
            name: "Triage",
            statusCategory: { key: "indeterminate", name: "In Progress" },
          },
        ],
      },
    ]);

    expect(groups).toEqual([
      {
        workflowId: "wf-1",
        workflowName: "Default Workflow",
        statuses: [{ id: "s-1", name: "To Do", statusCategory: { key: "new", name: "New" } }],
      },
      {
        workflowId: "wf-2",
        workflowName: "Support Workflow",
        statuses: [
          {
            id: "s-2",
            name: "Triage",
            statusCategory: { key: "indeterminate", name: "In Progress" },
          },
        ],
      },
    ]);
  });

  it("skips workflows without statuses", () => {
    expect(
      groupStatusesByWorkflow([
        { id: "wf-1", name: "Empty", statuses: [] },
        {
          id: "wf-2",
          name: "Active",
          statuses: [{ id: "s-1", name: "Open", statusCategory: { key: "new", name: "New" } }],
        },
      ]),
    ).toHaveLength(1);
  });

  it("sorts space workflows before account default workflows", () => {
    const groups = groupStatusesByWorkflow([
      {
        id: "wf-account",
        name: "Default",
        standard: true,
        statuses: [{ id: "s-2", name: "Open", statusCategory: { key: "new", name: "New" } }],
      },
      {
        id: "wf-space",
        name: "Space Workflow",
        standard: false,
        statuses: [{ id: "s-1", name: "To Do", statusCategory: { key: "new", name: "New" } }],
      },
    ]);

    expect(groups.map((group) => group.workflowName)).toEqual(["Space Workflow", "Default"]);
  });
});

describe("extractUniqueStatuses", () => {
  it("deduplicates statuses across workflows by id", () => {
    const sharedStatus = { id: "s-1", name: "Open", statusCategory: { key: "new", name: "New" } };
    expect(
      extractUniqueStatuses([
        { id: "wf-1", name: "A", statuses: [sharedStatus] },
        { id: "wf-2", name: "B", statuses: [sharedStatus] },
      ]),
    ).toEqual([sharedStatus]);
  });
});
