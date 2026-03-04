"use client";

import {
  createContext,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import type {
  IssueTypeOption,
  PriorityOption,
  AssigneeOption,
  ParentIssueOption,
  CreateTaskPayload,
  CreateTaskResult,
  CreateTaskFormValues,
} from "@/types/create-task";

/** Mutation-like object returned by the provider for create task. */
export interface CreateTaskMutation {
  mutateAsync: (payload: CreateTaskPayload) => Promise<CreateTaskResult>;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  reset: () => void;
}

/**
 * Platform-agnostic create-task provider interface.
 * Implemented by Jira, Asana, etc. and consumed by CreateTaskView.
 */
export interface ICreateTaskProvider {
  /** Project id for the current context (e.g. Jira project id). */
  projectId: string;

  /** Human-readable title for the form (e.g. "Create Jira Task"). */
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

  /** Create task mutation. */
  createTask: CreateTaskMutation;

  /** Upload attachments after task creation (e.g. background upload). taskKey is the created task key. */
  uploadAttachments: (taskKey: string, files: File[]) => void;

  /** Default form values for reset. */
  defaultFormValues: CreateTaskFormValues;
}

const CreateTaskContext = createContext<ICreateTaskProvider | null>(null);

export function CreateTaskProvider({
  value,
  children,
}: {
  value: ICreateTaskProvider;
  children: ReactNode;
}) {
  const memoized = useMemo(() => value, [value]);
  return (
    <CreateTaskContext.Provider value={memoized}>
      {children}
    </CreateTaskContext.Provider>
  );
}

export function useCreateTask(): ICreateTaskProvider {
  const ctx = useContext(CreateTaskContext);
  if (ctx == null) {
    throw new Error(
      "useCreateTask must be used within a CreateTaskProvider (e.g. JiraCreateTaskProvider).",
    );
  }
  return ctx;
}
