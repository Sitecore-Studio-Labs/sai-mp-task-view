import type { PlatformTask } from "@mp/task-core";
import { describe, expect, it } from "vitest";

import { applyWrikeClientTaskFilters, toWrikeTaskQueryParams } from "../wrikeTaskFilters";

describe("toWrikeTaskQueryParams", () => {
  it("maps status, assignee, and single priority to Wrike query params", () => {
    expect(
      toWrikeTaskQueryParams({
        status: ["status-1", "status-2"],
        assignee: ["user-1"],
        priority: ["High"],
      }),
    ).toEqual({
      customStatuses: JSON.stringify(["status-1", "status-2"]),
      responsibles: JSON.stringify(["user-1"]),
      importance: "High",
    });
  });

  it("sends all selected assignees as a single responsibles array (Wrike OR-matches any)", () => {
    expect(toWrikeTaskQueryParams({ assignee: ["user-1", "user-2"] })).toEqual({
      responsibles: JSON.stringify(["user-1", "user-2"]),
    });
  });

  it("omits responsibles when Unassigned is selected alongside specific users", () => {
    // Wrike's `responsibles` filter can only return tasks that HAVE a responsible —
    // it can't also include unassigned tasks. Sending it here would silently drop
    // every unassigned task before applyWrikeClientTaskFilters ever sees them.
    expect(toWrikeTaskQueryParams({ assignee: ["unassigned", "user-1"] })).toEqual({});
  });

  it("omits responsibles when only Unassigned is selected", () => {
    expect(toWrikeTaskQueryParams({ assignee: ["unassigned"] })).toEqual({});
  });
});

describe("applyWrikeClientTaskFilters", () => {
  const task = (priorityId?: string, statusId = "status-1", assigneeId?: string): PlatformTask => ({
    id: "t1",
    key: "t1",
    fields: {
      summary: "Task",
      status: {
        id: statusId,
        name: statusId,
        statusCategory: { key: "new", name: "New" },
      },
      issuetype: { id: "task", name: "Task" },
      priority: priorityId ? { id: priorityId, name: priorityId } : undefined,
      assignee: assigneeId ? { accountId: assigneeId, displayName: "User" } : undefined,
    },
  });

  it("filters by multiple priorities client-side", () => {
    const tasks = [task("High"), task("Low"), task("Normal")];
    const filtered = applyWrikeClientTaskFilters(tasks, { priority: ["High", "Low"] });
    expect(filtered.map((t) => t.fields.priority?.id)).toEqual(["High", "Low"]);
  });

  it("filters unassigned tasks client-side", () => {
    const tasks = [task("High", "status-1"), task("Low", "status-2", "user-1")];
    const filtered = applyWrikeClientTaskFilters(tasks, { assignee: ["unassigned"] });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].fields.assignee).toBeUndefined();
  });

  it("keeps tasks assigned to any of multiple selected users (OR, not AND)", () => {
    const tasks = [
      task("High", "status-1", "user-1"),
      task("Low", "status-2", "user-2"),
      task("Normal", "status-1", "user-3"),
    ];
    const filtered = applyWrikeClientTaskFilters(tasks, { assignee: ["user-1", "user-2"] });
    expect(filtered.map((t) => t.fields.assignee?.accountId)).toEqual(["user-1", "user-2"]);
  });

  it("unions unassigned and specific-user selections instead of intersecting them", () => {
    const tasks = [
      task("High", "status-1", "user-1"),
      task("Low", "status-2", "user-2"),
      task("Normal", "status-1", undefined),
    ];
    const filtered = applyWrikeClientTaskFilters(tasks, { assignee: ["unassigned", "user-1"] });
    expect(filtered.map((t) => t.fields.assignee?.accountId ?? "unassigned")).toEqual([
      "user-1",
      "unassigned",
    ]);
  });

  it("filters by status client-side as fallback", () => {
    const tasks = [task("High", "status-1"), task("Low", "status-2")];
    const filtered = applyWrikeClientTaskFilters(tasks, { status: ["status-2"] });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].fields.status.id).toBe("status-2");
  });
});
