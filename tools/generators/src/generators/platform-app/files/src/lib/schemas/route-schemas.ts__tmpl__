import { NextResponse } from "next/server";
import { z } from "zod";

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

const isoDateString = z
  .string()
  .refine((v) => /^\d{4}-\d{2}-\d{2}/.test(v) || !Number.isNaN(new Date(v).getTime()), {
    message: "Expected an ISO date or datetime string.",
  });

export const createIssueSchema = z.object({
  projectId: z.string().min(1, "projectId is required."),
  issueTypeId: z.string().optional(),
  summary: z.string().min(1, "summary is required."),
  description: z.string().optional(),
  priority: z.string().optional(),
  assignee: z.string().optional(),
  dueDate: isoDateString.optional(),
  parentIssueKey: z.string().optional(),
});

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
