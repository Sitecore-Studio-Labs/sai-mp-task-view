import { z } from "zod";

/**
 * Zod schema for the task form (create/edit).
 * Used with react-hook-form via @hookform/resolvers/zod for validation.
 * Sub-task parent requirement is validated in the view before submit.
 */
export const taskFormSchema = z.object({
  issueTypeId: z.string(),
  summary: z.string().min(1, "Summary is required"),
  description: z.string(),
  priority: z.string(),
  parentIssueKey: z.string(),
  assignee: z.string(),
  dueDate: z.date().nullable(),
});

export type TaskFormSchemaValues = z.infer<typeof taskFormSchema>;

/** Message shown when sub-task is selected but parent issue is missing. */
export const SUBTASK_PARENT_REQUIRED_MESSAGE = "Parent issue is required for sub-tasks.";
