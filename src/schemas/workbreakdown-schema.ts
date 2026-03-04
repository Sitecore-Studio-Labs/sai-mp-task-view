import { z } from "zod";
import type { WorkItem } from "@/types/workbreakdown";

const workItemTypeSchema = z.enum(["epic", "story", "task", "subtask"]);

const workItemMetadataSchema = z
  .object({
    priority: z.string().optional(),
    assigneeHint: z.string().optional(),
    issueTypeId: z.string().optional(),
    /** Acceptance criteria: list of measurable conditions for done. */
    acceptanceCriteria: z.array(z.string()).optional(),
  })
  .passthrough();

/** Recursive schema for a single work item (nested children). */
const workItemSchema: z.ZodType<WorkItem> = z.lazy(() =>
  z.object({
    id: z.string(),
    type: workItemTypeSchema,
    title: z.string().min(1, "Title is required"),
    description: z.string(),
    children: z.array(workItemSchema).default([]),
    metadata: workItemMetadataSchema.optional(),
    externalKey: z.string().optional(),
  }),
);

export const workBreakdownSchema = z.object({
  id: z.string(),
  projectKey: z.string().optional(),
  platform: z.string().optional(),
  status: z.enum(["draft", "approved", "published"]).default("draft"),
  items: z.array(workItemSchema).min(1, "At least one top-level item required"),
  createdAt: z.string(),
  updatedAt: z.string(),
});

/** Raw work item for AI output (id optional, children recursive). */
const rawWorkItemSchema: z.ZodType<{
  id?: string;
  type: z.infer<typeof workItemTypeSchema>;
  title: string;
  description: string;
  children?: unknown[];
  metadata?: z.infer<typeof workItemMetadataSchema>;
}> = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    type: workItemTypeSchema,
    title: z.string(),
    description: z.string().default(""),
    children: z.array(rawWorkItemSchema).optional().default([]),
    metadata: workItemMetadataSchema.optional(),
  }),
);

/** Schema for AI output: { items: [...] } or direct array. */
export const aiOutputSchema = z.union([
  z.object({ items: z.array(rawWorkItemSchema).min(1) }),
  z.array(rawWorkItemSchema).min(1).transform((arr) => ({ items: arr })),
]);

export type WorkItemSchema = z.infer<typeof workItemSchema>;
export type WorkBreakdownSchema = z.infer<typeof workBreakdownSchema>;
export type AiOutputSchema = z.infer<typeof aiOutputSchema>;
