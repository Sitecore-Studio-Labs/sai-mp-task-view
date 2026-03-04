import { z } from "zod";

/**
 * Zod schema for the task form (create/edit).
 * Used with react-hook-form via @hookform/resolvers/zod for validation.
 */
export const taskFormSchema = z.object({
  issueTypeId: z.string().min(1, "Issue type is required"),
  summary: z.string().min(1, "Summary is required"),
  description: z.string(),
  priority: z.string(),
  parentIssueKey: z.string(),
  assignee: z.string(),
  dueDate: z.date().nullable(),
});

export type TaskFormSchemaValues = z.infer<typeof taskFormSchema>;
