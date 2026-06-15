"use client";

import type { AssigneeOption, CreateTaskPayload, ICreateTaskProvider } from "@mp/task-core";
import { CreateTaskProvider as CreateTaskContextProvider } from "@mp/task-core";
import {
  useDebounce,
  usePlatformAssignees,
  usePlatformCreateIssue,
  usePlatformCurrentUser,
  usePlatformPriorities,
  usePlatformUploadAttachments,
} from "@mp/ui";
import { useCallback, useMemo, useState } from "react";

import { mapWrikeUserToAssignee } from "@/providers/shared/wrikeTaskProviderUtils";

const EMPTY_FORM_VALUES = {
  issueTypeId: "",
  summary: "",
  description: "",
  priority: "",
  parentIssueKey: "",
  assignee: "",
  dueDate: null as Date | null,
};

type WrikeCreateTaskProviderProps = {
  projectId: string;
  projectKey: string;
  children: React.ReactNode;
};

export function WrikeCreateTaskProvider({
  projectId,
  projectKey,
  children,
}: WrikeCreateTaskProviderProps) {
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const assigneeSearchDebounced = useDebounce(assigneeSearch, 300);

  const { data: priorities = [] } = usePlatformPriorities(projectKey);
  const { data: assigneesRaw = [], isLoading: assigneesLoading } = usePlatformAssignees(
    projectId,
    assigneeSearchDebounced,
  );
  const { data: currentUserRaw } = usePlatformCurrentUser();
  const createIssue = usePlatformCreateIssue();
  const uploadAttachmentFiles = usePlatformUploadAttachments();

  const assignees: AssigneeOption[] = useMemo(
    () => assigneesRaw.map(mapWrikeUserToAssignee),
    [assigneesRaw],
  );
  const currentUser: AssigneeOption | null = useMemo(
    () => (currentUserRaw ? mapWrikeUserToAssignee(currentUserRaw) : null),
    [currentUserRaw],
  );

  const createTask = useMemo(
    () => ({
      mutateAsync: (payload: CreateTaskPayload) => createIssue.mutateAsync(payload),
      isPending: createIssue.isPending,
      isError: createIssue.isError,
      error: createIssue.error as Error | null,
      reset: createIssue.reset,
    }),
    [createIssue],
  );

  const uploadAttachments = useCallback(
    (taskKey: string, files: File[]) => uploadAttachmentFiles(taskKey, files, "created"),
    [uploadAttachmentFiles],
  );

  const value: ICreateTaskProvider = useMemo(
    () => ({
      projectId,
      formTitle: "Create Wrike Task",
      issueTypes: [],
      issueTypesLoading: false,
      priorities: priorities,
      assignees: assignees,
      assigneesLoading: assigneesLoading,
      assigneeSearch: assigneeSearch,
      setAssigneeSearch: setAssigneeSearch,
      currentUser: currentUser,
      parentIssues: [],
      parentIssuesLoading: false,
      parentIssueSearch: "",
      setParentIssueSearch: () => {},
      getAllowedParentTypeNames: () => new Set<string>(),
      createTask,
      uploadAttachments: uploadAttachments,
      defaultFormValues: EMPTY_FORM_VALUES,
    }),
    [
      projectId,
      priorities,
      assignees,
      assigneesLoading,
      assigneeSearch,
      currentUser,
      createTask,
      uploadAttachments,
    ],
  );

  return <CreateTaskContextProvider value={value}>{children}</CreateTaskContextProvider>;
}
