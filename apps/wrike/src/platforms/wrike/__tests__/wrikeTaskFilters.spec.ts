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

  it("filters by status client-side as fallback", () => {
    const tasks = [task("High", "status-1"), task("Low", "status-2")];
    const filtered = applyWrikeClientTaskFilters(tasks, { status: ["status-2"] });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].fields.status.id).toBe("status-2");
  });
});
