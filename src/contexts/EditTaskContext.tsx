"use client";

import { createContext, type ReactNode, useContext, useMemo } from "react";

import type {
  AssigneeOption,
  CreateTaskFormValues,
  IssueTypeOption,
  ParentIssueOption,
  PriorityOption,
} from "@/types/create-task";

export type UpdateTaskPayload = {
  summary?: string;
  description?: string | null;
  issueType?: string | null;
  /** Required when changing to a sub-task. Jira issue key (e.g. "PROJ-123"). */
  parentIssueKey?: string | null;
  priority?: string | null;
  assignee?: string | null;
  dueDate?: string | null;
};

/** Mutation-like object returned by the provider for update task. */
export interface UpdateTaskMutation {
  mutateAsync: (payload: UpdateTaskPayload) => Promise<void>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Platform-agnostic edit-task provider interface.
 * Implemented by Jira, Asana, etc. and consumed by EditTaskView.
 */
export interface IEditTaskProvider {
  /** Project id for the current context (e.g. Jira project id). */
  projectId: string;

  /** Issue/task key/id being edited. */
  taskKey: string;

  /** Human-readable title for the form (e.g. "Edit Jira Task"). */
  formTitle: string;

  /** Issue/types for the project. */
  issueTypes: IssueTypeOption[];
  issueTypesLoading: boolean;

  /** Priorities (may be empty if platform has none). */
  priorities: PriorityOption[];

  /** Assignees (filtered by assigneeSearch). */
  assignees: AssigneeOption[];
  assigneesLoading: boolean;
  assigneeSearch: string;
  setAssigneeSearch: (value: string) => void;
  /** Current user for "Assign to me". Null if not supported. */
  currentUser: AssigneeOption | null;

  /** Parent issues (filtered by parentIssueSearch). */
  parentIssues: ParentIssueOption[];
  parentIssuesLoading: boolean;
  parentIssueSearch: string;
  setParentIssueSearch: (value: string) => void;
  /** Returns allowed parent issue type names for a given child type. Empty set = no parent support. */
  getAllowedParentTypeNames: (childIssueTypeName: string) => Set<string>;

  /** Update task mutation. */
  updateTask: UpdateTaskMutation;

  /** Upload attachments after update (optional). */
  uploadAttachments: (taskKey: string, files: File[]) => Promise<void>;

  /** Existing attachments for the task (read-only). */
  existingAttachments: Array<{
    id: string;
    filename: string;
  }>;

  /** Optional display override for currently assigned user. */
  initialAssignee: AssigneeOption | null;

  /** Default form values (prefilled from existing task). */
  defaultFormValues: CreateTaskFormValues;
}

const EditTaskContext = createContext<IEditTaskProvider | null>(null);

export function EditTaskProvider({
  value,
  children,
}: {
  value: IEditTaskProvider;
  children: ReactNode;
}) {
  const memoized = useMemo(() => value, [value]);
  return <EditTaskContext.Provider value={memoized}>{children}</EditTaskContext.Provider>;
}

export function useEditTask(): IEditTaskProvider {
  const ctx = useContext(EditTaskContext);
  if (ctx == null) {
    throw new Error("useEditTask must be used within an EditTaskProvider.");
  }
  return ctx;
}
