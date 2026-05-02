import { NextResponse } from "next/server";
import { z } from "zod";

// ── Parse helper ─────────────────────────────────────────────────────────────

/**
 * Parses `data` against `schema` and returns a discriminated result.
 * On failure the response is a 400 JSON with Zod's flattened error details.
 */
export function parseBody<T>(
  schema: z.ZodType<T>,
  data: unknown,
): { ok: true; data: T } | { ok: false; response: NextResponse } {
  const result = schema.safeParse(data);
  if (!result.success) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Validation failed.", details: result.error.flatten() },
        { status: 400 },
      ),
    };
  }
  return { ok: true, data: result.data };
}

// ── Issues ────────────────────────────────────────────────────────────────────

const isoDateString = z
  .string()
  .refine((v) => /^\d{4}-\d{2}-\d{2}/.test(v) || !Number.isNaN(new Date(v).getTime()), {
    message: "Expected an ISO date or datetime string.",
  });

export const createIssueSchema = z.object({
  projectId: z.string().min(1, "projectId is required."),
  issueTypeId: z.string().min(1, "issueTypeId is required."),
  summary: z.string().min(1, "summary is required."),
  description: z.string().optional(),
  priority: z.string().optional(),
  assignee: z.string().optional(),
  dueDate: isoDateString.optional(),
  parentIssueKey: z.string().optional(),
});

export type CreateIssueBody = z.infer<typeof createIssueSchema>;

export const updateIssueSchema = z
  .object({
    summary: z.string().optional(),
    description: z.string().nullable().optional(),
    issueType: z.string().nullable().optional(),
    parentIssueKey: z.string().nullable().optional(),
    priority: z.string().nullable().optional(),
    assignee: z.string().nullable().optional(),
    dueDate: z.string().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message:
      "No fields to update. Send at least one of summary, description, issueType, parentIssueKey, priority, assignee, dueDate.",
  });

export type UpdateIssueBody = z.infer<typeof updateIssueSchema>;

// ── Comments ─────────────────────────────────────────────────────────────────

export const createCommentSchema = z.object({
  issueIdOrKey: z.string().min(1, "issueIdOrKey is required."),
  text: z.string().min(1, "text is required."),
  replyToCommentId: z.string().optional(),
  replyToAuthorAccountId: z.string().optional(),
  replyToAuthorDisplayName: z.string().optional(),
});

export type CreateCommentBody = z.infer<typeof createCommentSchema>;

// ── Transitions ───────────────────────────────────────────────────────────────

export const transitionIssueSchema = z.object({
  transitionId: z.string().min(1, "transitionId is required."),
});

export type TransitionIssueBody = z.infer<typeof transitionIssueSchema>;

// ── AI parse-requirements ─────────────────────────────────────────────────────

export const parseRequirementsSchema = z.object({
  requirementText: z.string().min(1, "requirementText is required."),
  projectKey: z.string().optional(),
  platform: z.string().optional(),
});

export type ParseRequirementsBody = z.infer<typeof parseRequirementsSchema>;

// ── Work breakdown publish ────────────────────────────────────────────────────

export const publishWorkbreakdownSchema = z.object({
  projectId: z.string().min(1, "projectId is required."),
});

export type PublishWorkbreakdownBody = z.infer<typeof publishWorkbreakdownSchema>;

// ── Work breakdown PATCH (discriminated union) ────────────────────────────────

const workItemTypeSchema = z.enum(["epic", "story", "task", "subtask"]);

export const patchWorkbreakdownSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("updateNode"),
    itemId: z.string().min(1, "itemId is required."),
    payload: z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      type: workItemTypeSchema.optional(),
      metadata: z.record(z.unknown()).optional(),
    }),
  }),
  z.object({
    op: z.literal("deleteNode"),
    itemId: z.string().min(1, "itemId is required."),
  }),
  z.object({
    op: z.literal("addChild"),
    parentId: z.string().nullable(),
    item: z.object({
      type: workItemTypeSchema,
      title: z.string().optional(),
      description: z.string().optional(),
      metadata: z.record(z.unknown()).optional(),
    }),
  }),
]);

export type PatchWorkbreakdownBody = z.infer<typeof patchWorkbreakdownSchema>;
