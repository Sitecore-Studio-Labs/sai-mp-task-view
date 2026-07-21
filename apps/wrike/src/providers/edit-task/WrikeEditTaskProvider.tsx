"use client";

import type {
  AssigneeOption,
  IEditTaskProvider,
  PlatformTask,
  UpdateTaskPayload,
} from "@mp/task-core";
import { EditTaskProvider as EditTaskContextProvider } from "@mp/task-core";
import {
  useDebounce,
  usePlatformAssignees,
  usePlatformCurrentUser,
  usePlatformPriorities,
  usePlatformProjectIssues,
  usePlatformUpdateIssue,
  usePlatformUploadAttachments,
} from "@mp/ui";
import { useCallback, useMemo, useState } from "react";

import {
  getAllowedWrikeParentIssueTypeNames,
  mapWrikeUserToAssignee,
  PARENT_ISSUE_SEARCH_DEBOUNCE_MS,
} from "@/providers/shared/wrikeTaskProviderUtils";

type WrikeEditTaskProviderProps = {
  projectId: string;
  taskKey: string;
  task: PlatformTask;
  children: React.ReactNode;
};

export function WrikeEditTaskProvider({
  projectId,
  taskKey,
  task,
  children,
}: WrikeEditTaskProviderProps) {
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [parentIssueSearch, setParentIssueSearch] = useState("");

  const assigneeSearchDebounced = useDebounce(assigneeSearch, 300);
  const parentIssueSearchDebounced = useDebounce(
    parentIssueSearch,
    PARENT_ISSUE_SEARCH_DEBOUNCE_MS,
  );

  const { data: priorities = [] } = usePlatformPriorities(projectId);
  const { data: assigneesRaw = [], isLoading: assigneesLoading } = usePlatformAssignees(
    projectId,
    assigneeSearchDebounced,
  );
  const { data: currentUserRaw } = usePlatformCurrentUser();
  const { data: parentIssuesRaw = [], isLoading: parentIssuesLoading } = usePlatformProjectIssues(
    projectId || null,
  );
  const parentIssues = useMemo(() => {
    const q = parentIssueSearchDebounced.trim().toLowerCase();
    const withoutSelf = parentIssuesRaw.filter((i) => i.key !== task.key);
    if (!q) return withoutSelf;
    return withoutSelf.filter(
      (issue) => issue.key.toLowerCase().includes(q) || issue.summary.toLowerCase().includes(q),
    );
  }, [parentIssuesRaw, parentIssueSearchDebounced, task.key]);

  const updateIssue = usePlatformUpdateIssue(taskKey);
  const uploadAttachmentFiles = usePlatformUploadAttachments();

  const assignees: AssigneeOption[] = useMemo(
    () => assigneesRaw.map(mapWrikeUserToAssignee),
    [assigneesRaw],
  );
  const currentUser: AssigneeOption | null = useMemo(
    () => (currentUserRaw ? mapWrikeUserToAssignee(currentUserRaw) : null),
    [currentUserRaw],
  );
  const initialAssignee: AssigneeOption | null = useMemo(
    () => (task.fields.assignee ? mapWrikeUserToAssignee(task.fields.assignee) : null),
    [task.fields.assignee],
  );

  const updateTask = useMemo(
    () => ({
      mutateAsync: async (payload: UpdateTaskPayload) => updateIssue.mutateAsync(payload),
      isPending: updateIssue.isPending,
      isError: updateIssue.isError,
      error: (updateIssue.error as Error | null) ?? null,
      reset: updateIssue.reset,
    }),
    [updateIssue],
  );

  const uploadAttachments = useCallback(
    (key: string, files: File[]) => uploadAttachmentFiles(key, files, "updated"),
    [uploadAttachmentFiles],
  );
  const existingAttachments = useMemo(
    () => (task.fields.attachment ?? []).map((a) => ({ id: a.id, filename: a.filename })),
    [task.fields.attachment],
  );

  const getAllowedParentTypeNames = useCallback(
    (childIssueTypeName: string) => getAllowedWrikeParentIssueTypeNames(childIssueTypeName),
    [],
  );

  const defaultFormValues = useMemo(
    () => ({
      issueTypeId: "",
      summary: task.fields.summary ?? "",
      description: typeof task.fields.description === "string" ? task.fields.description : "",
      priority: task.fields.priority?.id ?? "",
      parentIssueKey: task.fields.parent?.key ?? "",
      assignee: task.fields.assignee?.accountId ?? "",
      dueDate: task.fields.duedate ? new Date(task.fields.duedate) : null,
    }),
    [task],
  );

  const value: IEditTaskProvider = useMemo(
    () => ({
      projectId,
      taskKey,
      formTitle: "Edit Wrike Task",
      issueTypes: [],
      issueTypesLoading: false,
      priorities: priorities,
      assignees: assignees,
      assigneesLoading: assigneesLoading,
      assigneeSearch: assigneeSearch,
      setAssigneeSearch: setAssigneeSearch,
      currentUser: currentUser,
      parentIssues,
      parentIssuesLoading,
      parentIssueSearch,
      setParentIssueSearch,
      getAllowedParentTypeNames,
      updateTask,
      uploadAttachments,
      existingAttachments,
      initialAssignee: initialAssignee,
      defaultFormValues,
    }),
    [
      projectId,
      taskKey,
      priorities,
      assignees,
      assigneesLoading,
      assigneeSearch,
      currentUser,
      parentIssues,
      parentIssuesLoading,
      parentIssueSearch,
      getAllowedParentTypeNames,
      initialAssignee,
      updateTask,
      uploadAttachments,
      existingAttachments,
      defaultFormValues,
    ],
  );

  return <EditTaskContextProvider value={value}>{children}</EditTaskContextProvider>;
}
