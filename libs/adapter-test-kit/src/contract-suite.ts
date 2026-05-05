import type { PlatformServiceAdapter } from "@mp/task-core";
import { describe, expect, it } from "vitest";

import {
  FIXTURE_ADD_COMMENT_PAYLOAD,
  FIXTURE_COMMENT,
  FIXTURE_CREATE_PAYLOAD,
  FIXTURE_PROJECT,
  FIXTURE_TASK,
  FIXTURE_TRANSITION,
} from "./fixtures";

/**
 * Runs the full PlatformServiceAdapter contract suite against any adapter instance.
 *
 * Usage:
 *   runAdapterContractSuite(() => new MyServiceAdapter(mockClient))
 *
 * The factory is called once per `describe` block. Wire up your mock HTTP client
 * or MemoryTokenStore before passing the factory so the adapter starts pre-authenticated.
 */
export function runAdapterContractSuite(createAdapter: () => PlatformServiceAdapter): void {
  let adapter: PlatformServiceAdapter;

  describe("PlatformServiceAdapter contract", () => {
    // ── Projects ────────────────────────────────────────────────────────────

    describe("getProjects", () => {
      it("resolves to an array", async () => {
        adapter = createAdapter();
        const result = await adapter.getProjects();
        expect(Array.isArray(result)).toBe(true);
      });

      it("each project has id, key, and name", async () => {
        adapter = createAdapter();
        const result = await adapter.getProjects();
        if (result.length > 0) {
          const project = result[0];
          expect(typeof project.id).toBe("string");
          expect(typeof project.key).toBe("string");
          expect(typeof project.name).toBe("string");
        }
      });
    });

    // ── Tasks ────────────────────────────────────────────────────────────────

    describe("getTasks", () => {
      it("resolves with issues array and isLast flag", async () => {
        adapter = createAdapter();
        const result = await adapter.getTasks(FIXTURE_PROJECT.key);
        expect(Array.isArray(result.issues)).toBe(true);
        expect(typeof result.isLast).toBe("boolean");
      });

      it("each task has id, key, and fields.summary", async () => {
        adapter = createAdapter();
        const result = await adapter.getTasks(FIXTURE_PROJECT.key);
        if (result.issues.length > 0) {
          const task = result.issues[0];
          expect(typeof task.id).toBe("string");
          expect(typeof task.key).toBe("string");
          expect(typeof task.fields.summary).toBe("string");
        }
      });

      it("nextPageToken is string or undefined", async () => {
        adapter = createAdapter();
        const result = await adapter.getTasks(FIXTURE_PROJECT.key);
        expect(result.nextPageToken === undefined || typeof result.nextPageToken === "string").toBe(
          true,
        );
      });

      it("accepts optional cursor and filters without throwing", async () => {
        adapter = createAdapter();
        await expect(
          adapter.getTasks(FIXTURE_PROJECT.key, undefined, {
            assignee: [],
            priority: [],
            status: [],
          }),
        ).resolves.toBeDefined();
      });
    });

    describe("getTask", () => {
      it("resolves with a task matching the requested id", async () => {
        adapter = createAdapter();
        const result = await adapter.getTask(FIXTURE_TASK.id);
        expect(result.id).toBe(FIXTURE_TASK.id);
        expect(typeof result.key).toBe("string");
        expect(result.fields).toBeDefined();
      });

      it("task status has statusCategory.key", async () => {
        adapter = createAdapter();
        const result = await adapter.getTask(FIXTURE_TASK.id);
        expect(typeof result.fields.status.statusCategory.key).toBe("string");
      });
    });

    describe("createTask", () => {
      it("resolves with a CreateTaskResult shape", async () => {
        adapter = createAdapter();
        const result = await adapter.createTask(FIXTURE_CREATE_PAYLOAD);
        expect(typeof result.id).toBe("string");
        expect(typeof result.key).toBe("string");
        expect(typeof result.summary).toBe("string");
        expect(typeof result.projectId).toBe("string");
        expect(typeof result.projectKey).toBe("string");
      });
    });

    describe("updateTask", () => {
      it("resolves with the updated task", async () => {
        adapter = createAdapter();
        const result = await adapter.updateTask(FIXTURE_TASK.id, {
          summary: "Updated summary",
        });
        expect(result.id).toBe(FIXTURE_TASK.id);
        expect(result.fields).toBeDefined();
      });
    });

    describe("deleteTask", () => {
      it("resolves with a numeric HTTP status code", async () => {
        adapter = createAdapter();
        const status = await adapter.deleteTask(FIXTURE_TASK.id);
        expect(typeof status).toBe("number");
        expect(status).toBeGreaterThanOrEqual(200);
        expect(status).toBeLessThan(300);
      });
    });

    // ── Metadata ─────────────────────────────────────────────────────────────

    describe("getIssueTypes", () => {
      it("resolves to an array", async () => {
        adapter = createAdapter();
        const result = await adapter.getIssueTypes(FIXTURE_PROJECT.id);
        expect(Array.isArray(result)).toBe(true);
      });

      it("each issue type has id and name", async () => {
        adapter = createAdapter();
        const result = await adapter.getIssueTypes(FIXTURE_PROJECT.id);
        if (result.length > 0) {
          expect(typeof result[0].id).toBe("string");
          expect(typeof result[0].name).toBe("string");
        }
      });
    });

    describe("getPriorities", () => {
      it("resolves to an array", async () => {
        adapter = createAdapter();
        const result = await adapter.getPriorities();
        expect(Array.isArray(result)).toBe(true);
      });

      it("each priority has id and name", async () => {
        adapter = createAdapter();
        const result = await adapter.getPriorities();
        if (result.length > 0) {
          expect(typeof result[0].id).toBe("string");
          expect(typeof result[0].name).toBe("string");
        }
      });
    });

    describe("getProjectPriorities", () => {
      it("resolves to an array", async () => {
        adapter = createAdapter();
        const result = await adapter.getProjectPriorities(FIXTURE_PROJECT.id);
        expect(Array.isArray(result)).toBe(true);
      });
    });

    describe("getAssignees", () => {
      it("resolves to an array", async () => {
        adapter = createAdapter();
        const result = await adapter.getAssignees({ projectIdOrKey: FIXTURE_PROJECT.key });
        expect(Array.isArray(result)).toBe(true);
      });

      it("each assignee has id and displayName", async () => {
        adapter = createAdapter();
        const result = await adapter.getAssignees({ projectIdOrKey: FIXTURE_PROJECT.key });
        if (result.length > 0) {
          expect(typeof result[0].id).toBe("string");
          expect(typeof result[0].displayName).toBe("string");
        }
      });

      it("accepts an optional query parameter", async () => {
        adapter = createAdapter();
        await expect(
          adapter.getAssignees({ projectIdOrKey: FIXTURE_PROJECT.key, query: "test" }),
        ).resolves.toBeDefined();
      });
    });

    describe("getCurrentUser", () => {
      it("resolves with a PlatformUser shape", async () => {
        adapter = createAdapter();
        const result = await adapter.getCurrentUser();
        expect(typeof result.accountId === "string" || result.accountId === undefined).toBe(true);
        expect(typeof result.displayName === "string" || result.displayName === undefined).toBe(
          true,
        );
      });
    });

    describe("getProjectStatuses", () => {
      it("resolves to an array", async () => {
        adapter = createAdapter();
        const result = await adapter.getProjectStatuses(FIXTURE_PROJECT.key);
        expect(Array.isArray(result)).toBe(true);
      });

      it("each bucket has id, name, and statuses[] (Jira / UI shape)", async () => {
        adapter = createAdapter();
        const result = await adapter.getProjectStatuses(FIXTURE_PROJECT.key);
        if (result.length > 0) {
          expect(typeof result[0].id).toBe("string");
          expect(typeof result[0].name).toBe("string");
          expect(Array.isArray(result[0].statuses)).toBe(true);
        }
      });
    });

    // ── Task lifecycle ────────────────────────────────────────────────────────

    describe("getTransitions", () => {
      it("resolves to an array", async () => {
        adapter = createAdapter();
        const result = await adapter.getTransitions(FIXTURE_TASK.id);
        expect(Array.isArray(result)).toBe(true);
      });

      it("each transition has id, name, and to.statusCategory.key", async () => {
        adapter = createAdapter();
        const result = await adapter.getTransitions(FIXTURE_TASK.id);
        if (result.length > 0) {
          expect(typeof result[0].id).toBe("string");
          expect(typeof result[0].name).toBe("string");
          expect(typeof result[0].to.statusCategory.key).toBe("string");
        }
      });
    });

    describe("changeStatus", () => {
      it("resolves without throwing", async () => {
        adapter = createAdapter();
        await expect(
          adapter.changeStatus(FIXTURE_TASK.id, FIXTURE_TRANSITION.id),
        ).resolves.toBeUndefined();
      });
    });

    // ── Comments ──────────────────────────────────────────────────────────────

    describe("getComments", () => {
      it("resolves with startAt, maxResults, total, and comments array", async () => {
        adapter = createAdapter();
        const result = await adapter.getComments(FIXTURE_TASK.id);
        expect(typeof result.startAt).toBe("number");
        expect(typeof result.maxResults).toBe("number");
        expect(typeof result.total).toBe("number");
        expect(Array.isArray(result.comments)).toBe(true);
      });
    });

    describe("getComment", () => {
      it("resolves with a PlatformComment shape", async () => {
        adapter = createAdapter();
        const result = await adapter.getComment(FIXTURE_TASK.id, FIXTURE_COMMENT.id);
        expect(typeof result.id).toBe("string");
        expect(result.author).toBeDefined();
        expect(typeof result.created).toBe("string");
        expect(typeof result.updated).toBe("string");
      });
    });

    describe("createComment", () => {
      it("resolves with a PlatformComment shape", async () => {
        adapter = createAdapter();
        const result = await adapter.createComment(FIXTURE_ADD_COMMENT_PAYLOAD);
        expect(typeof result.id).toBe("string");
        expect(result.author).toBeDefined();
      });
    });

    // ── Permissions ───────────────────────────────────────────────────────────

    describe("getPermission", () => {
      it("resolves with a boolean", async () => {
        adapter = createAdapter();
        const result = await adapter.getPermission("BROWSE_PROJECTS", {
          projectKey: FIXTURE_PROJECT.key,
        });
        expect(typeof result).toBe("boolean");
      });

      it("accepts options-only form", async () => {
        adapter = createAdapter();
        const result = await adapter.getPermission("CREATE_ISSUES");
        expect(typeof result).toBe("boolean");
      });
    });

    // ── Attachments ───────────────────────────────────────────────────────────

    describe("getAttachmentContent", () => {
      it("resolves without throwing", async () => {
        adapter = createAdapter();
        await expect(adapter.getAttachmentContent("attachment-1")).resolves.toBeDefined();
      });
    });

    describe("addAttachment", () => {
      it("resolves without throwing", async () => {
        adapter = createAdapter();
        await expect(
          adapter.addAttachment(FIXTURE_TASK.id, {
            buffer: Buffer.from("test content"),
            fileName: "test.txt",
            mimeType: "text/plain",
          }),
        ).resolves.toBeUndefined();
      });
    });

    describe("deleteAttachment", () => {
      it("resolves without throwing", async () => {
        adapter = createAdapter();
        await expect(adapter.deleteAttachment("attachment-1")).resolves.toBeUndefined();
      });
    });
  });
}
