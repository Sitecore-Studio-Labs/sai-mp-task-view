"use client";

import { useEffect, useMemo } from "react";
import { useForm, FormProvider, type SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateTask } from "@/contexts/CreateTaskContext";
import { taskFormSchema } from "@/schemas/task-form-schema";
import type { CreateTaskFormValues } from "@/types/create-task";
import type { WorkItem } from "@/types/workbreakdown";
import type { WorkItemType } from "@/types/workbreakdown";
import {
  TaskFormIssueTypeField,
  TaskFormSummaryField,
  TaskFormDescriptionField,
  TaskFormPriorityField,
  TaskFormActions,
} from "./task-form";
/** Jira issue type name variants for exact match only (case-insensitive). Order matters: try most common first. */
const TYPE_TO_NAMES: Record<WorkItemType, string[]> = {
  epic: ["Epic", "EPIC"],
  story: ["Story", "User Story", "Stories", "story"],
  task: ["Task", "Tasks", "task"],
  subtask: ["Sub-task", "Subtask", "Sub task", "sub-task", "subtask"],
};

function getIssueTypeIdForNode(
  issueTypes: { id: string; name: string }[],
  nodeType: WorkItemType,
): string {
  const normalized = (s: string) => s.trim().toLowerCase();
  const names = TYPE_TO_NAMES[nodeType];
  for (const want of names) {
    const found = issueTypes.find(
      (t) => normalized(t.name) === normalized(want),
    );
    if (found) return found.id;
  }
  // Fallback for story: match any type whose name contains "story" but not "sub" (avoids Sub-task).
  if (nodeType === "story") {
    const storyLike = issueTypes.find(
      (t) => normalized(t.name).includes("story") && !normalized(t.name).includes("sub"),
    );
    if (storyLike) return storyLike.id;
  }
  return issueTypes[0]?.id ?? "";
}

type PatchMutation = {
  mutateAsync: (body: {
    op: "updateNode";
    itemId: string;
    payload: Partial<{
      title: string;
      description: string;
      type: WorkItemType;
      metadata: Record<string, unknown>;
    }>;
  }) => Promise<unknown>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
};

type WorkBreakdownEditFormProps = {
  node: WorkItem;
  patchMutation: PatchMutation;
  onCancel: () => void;
  onSaved: () => void;
};

export function WorkBreakdownEditForm({
  node,
  patchMutation,
  onCancel,
  onSaved,
}: WorkBreakdownEditFormProps) {
  const { issueTypes, issueTypesLoading, priorities, defaultFormValues } = useCreateTask();

  /** Description plus acceptance criteria in one block for the description field. */
  const descriptionWithCriteria = useMemo(() => {
    const base = node.description?.trim() ?? "";
    const criteria = Array.isArray(node.metadata?.acceptanceCriteria)
      ? (node.metadata.acceptanceCriteria as string[])
      : [];
    if (criteria.length === 0) return base;
    const criteriaBlock =
      "\n\n**Acceptance criteria**\n" + criteria.map((c) => `- ${c}`).join("\n");
    return base ? base + criteriaBlock : criteriaBlock.trim();
  }, [node.description, node.metadata?.acceptanceCriteria]);

  const defaultValues = useMemo((): CreateTaskFormValues => {
    const issueTypeId =
      issueTypes.length > 0
        ? getIssueTypeIdForNode(issueTypes, node.type)
        : defaultFormValues.issueTypeId;
    const priority =
      ((node.metadata?.priority as string)?.trim()) ||
      (priorities[0]?.id ?? defaultFormValues.priority);
    const assignee =
      (node.metadata?.assigneeHint as string)?.trim() ||
      defaultFormValues.assignee;
    return {
      issueTypeId,
      summary: node.title,
      description: descriptionWithCriteria,
      priority: priority || "",
      parentIssueKey: defaultFormValues.parentIssueKey,
      assignee: assignee || "",
      dueDate: defaultFormValues.dueDate,
    };
  }, [
    node.type,
    node.title,
    descriptionWithCriteria,
    node.metadata,
    issueTypes,
    priorities,
    defaultFormValues,
  ]);

  const form = useForm<CreateTaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues,
    mode: "onChange",
  });

  // When node or issue types change, reset form so the correct issue type (matching node.type) is shown.
  useEffect(() => {
    if (issueTypes.length === 0) return;
    const issueTypeId = getIssueTypeIdForNode(issueTypes, node.type);
    const priority =
      ((node.metadata?.priority as string)?.trim()) ||
      (priorities[0]?.id ?? "");
    form.reset({
      issueTypeId,
      summary: node.title,
      description: descriptionWithCriteria,
      priority: priority || "",
      parentIssueKey: defaultFormValues.parentIssueKey,
      assignee: (node.metadata?.assigneeHint as string)?.trim() || "",
      dueDate: defaultFormValues.dueDate,
    });
  // Intentional: only reset when node/issueTypes/description change; full deps would cause redundant resets
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issueTypes.length, node.id, node.type, descriptionWithCriteria]);

  const handleSave: SubmitHandler<CreateTaskFormValues> = async (values) => {
    await patchMutation.mutateAsync({
      op: "updateNode",
      itemId: node.id,
      payload: {
        title: values.summary.trim(),
        description: values.description?.trim() ?? "",
        metadata: {
          priority: values.priority?.trim() || undefined,
          assigneeHint: values.assignee?.trim() || undefined,
        },
      },
    });
    onSaved();
  };
  const onSubmit = form.handleSubmit(handleSave);

  const mockCreateTask = useMemo(
    () => ({
      mutateAsync: async () => ({ id: "", key: "", summary: "", projectId: "", projectKey: "" }),
      isPending: patchMutation.isPending,
      isError: patchMutation.isError,
      error: patchMutation.error as Error | null,
      reset: patchMutation.reset,
    }),
    [
      patchMutation.isPending,
      patchMutation.isError,
      patchMutation.error,
      patchMutation.reset,
    ],
  );

  return (
    <FormProvider {...form}>
      <form onSubmit={(e) => { e.preventDefault(); void onSubmit(e); }} className="space-y-4">
        <div className="space-y-3">
          <TaskFormIssueTypeField
            issueTypes={issueTypes}
            issueTypesLoading={issueTypesLoading}
          />
          <TaskFormSummaryField />
          <TaskFormDescriptionField />
          <TaskFormPriorityField priorities={priorities} />
        </div>
        <TaskFormActions
          createTask={mockCreateTask}
          onBack={onCancel}
          onRetry={() => { void form.handleSubmit(handleSave)(); }}
          submitLabel="Save"
          submittingLabel="Saving…"
          errorFallbackMessage="Failed to save changes."
        />
      </form>
    </FormProvider>
  );
}
