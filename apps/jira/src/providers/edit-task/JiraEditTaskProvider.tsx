"use client";

import type {
  AssigneeOption,
  CreateTaskFormValues,
  IEditTaskProvider,
  ParentIssueOption,
  UpdateTaskPayload,
} from "@mp/task-core";
import { adfToHtml, EditTaskProvider as EditTaskContextProvider } from "@mp/task-core";
import {
  useDebounce,
  usePlatformIssueTypes,
  usePlatformPriorities,
  usePlatformProjectIssues,
  usePlatformUpdateIssue,
} from "@mp/ui";
import { useCallback, useMemo, useState } from "react";

import { useJiraAssignees } from "@/hooks/useJiraAssignees";
import { useJiraCurrentUser } from "@/hooks/useJiraCurrentUser";
import {
  ASSIGNEE_SEARCH_DEBOUNCE_MS,
  getAllowedParentIssueTypeNames,
  mapJiraUserToAssignee,
  PARENT_ISSUE_SEARCH_DEBOUNCE_MS,
  uploadJiraAttachments,
} from "@/providers/shared/jiraTaskProviderUtils";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";
import type { JiraIssue } from "@/types/jira";

function buildDefaultFormValues(task: JiraIssue): CreateTaskFormValues {
  return {
    issueTypeId: task.fields.issuetype?.id ?? "",
    summary: task.fields.summary ?? "",
    // Prefill as HTML so TipTap preserves formatting; unchanged descriptions are omitted on save.
    description: adfToHtml(task.fields.description),
    priority: task.fields.priority?.id ?? "",
    parentIssueKey: task.fields.parent?.key ?? "",
    assignee: task.fields.assignee?.accountId ?? "",
    dueDate: task.fields.duedate ? new Date(task.fields.duedate) : null,
  };
}

type JiraEditTaskProviderInnerProps = {
  projectId: string;
  taskKey: string;
  task: JiraIssue;
  children: React.ReactNode;
};

function JiraEditTaskProviderInner({
  projectId,
  taskKey,
  task,
  children,
}: JiraEditTaskProviderInnerProps) {
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [parentIssueSearch, setParentIssueSearch] = useState("");

  const assigneeSearchDebounced = useDebounce(assigneeSearch, ASSIGNEE_SEARCH_DEBOUNCE_MS);
  const parentIssueSearchDebounced = useDebounce(
    parentIssueSearch,
    PARENT_ISSUE_SEARCH_DEBOUNCE_MS,
  );

  const projectKey = task.key?.split("-")[0] ?? "";
  const { projects } = useTaskManager();
  const taskProjectId =
    (projectKey ? projects.find((p) => p.key === projectKey)?.id : undefined) ?? projectId;

  const { data: issueTypes = [], isLoading: issueTypesLoading } = usePlatformIssueTypes(
    taskProjectId ?? null,
  );
  const { data: priorities = [] } = usePlatformPriorities(projectKey);
  const { data: assigneesRaw = [], isLoading: assigneesLoading } = useJiraAssignees(
    taskProjectId ?? null,
    assigneeSearchDebounced,
  );
  const { data: currentUserRaw } = useJiraCurrentUser();
  const { data: parentIssuesRaw = [], isLoading: parentIssuesLoading } = usePlatformProjectIssues(
    projectKey || null,
    parentIssueSearchDebounced,
  );

  const updateJiraTask = usePlatformUpdateIssue(taskKey);

  const assignees: AssigneeOption[] = useMemo(() => {
    const list = assigneesRaw.map(mapJiraUserToAssignee);
    const fromTask = task.fields.assignee ? mapJiraUserToAssignee(task.fields.assignee) : null;
    if (!fromTask) return list;
    if (list.some((a) => a.id === fromTask.id)) return list;
    return [fromTask, ...list];
  }, [assigneesRaw, task.fields.assignee]);

  const currentUser: AssigneeOption | null = useMemo(
    () => (currentUserRaw ? mapJiraUserToAssignee(currentUserRaw) : null),
    [currentUserRaw],
  );

  const initialAssignee: AssigneeOption | null = useMemo(() => {
    const a = task.fields.assignee;
    return a ? mapJiraUserToAssignee(a) : null;
  }, [task.fields.assignee]);

  const existingAttachments = useMemo(
    () => (task.fields.attachment ?? []).map((a) => ({ id: a.id, filename: a.filename })),
    [task.fields.attachment],
  );

  // Parent list is already scoped by projectKey; exclude the issue being edited.
  const parentIssues: ParentIssueOption[] = useMemo(
    () => parentIssuesRaw.filter((i) => i.key !== task.key),
    [parentIssuesRaw, task.key],
  );

  const getAllowedParentTypeNames = useCallback(
    (childIssueTypeName: string) => getAllowedParentIssueTypeNames(childIssueTypeName),
    [],
  );

  const defaultFormValues = useMemo(() => buildDefaultFormValues(task), [task]);

  const updateTask = useMemo(
    () => ({
      mutateAsync: async (payload: UpdateTaskPayload) => updateJiraTask.mutateAsync(payload),
      isPending: updateJiraTask.isPending,
      isError: updateJiraTask.isError,
      error: (updateJiraTask.error as Error | null) ?? null,
      reset: updateJiraTask.reset,
    }),
    [updateJiraTask],
  );

  const uploadAttachments = useCallback(async (key: string, files: File[]) => {
    await uploadJiraAttachments(key, files, "updated");
  }, []);

  const value: IEditTaskProvider = useMemo(
    () => ({
      projectId,
      taskKey,
      formTitle: "Edit Jira Task",
      issueTypes,
      issueTypesLoading,
      priorities,
      assignees,
      assigneesLoading,
      assigneeSearch,
      setAssigneeSearch,
      currentUser,
      parentIssues,
      parentIssuesLoading,
      parentIssueSearch,
      setParentIssueSearch,
      getAllowedParentTypeNames,
      updateTask,
      uploadAttachments,
      existingAttachments,
      initialAssignee,
      defaultFormValues,
    }),
    [
      projectId,
      taskKey,
      issueTypes,
      issueTypesLoading,
      priorities,
      assignees,
      assigneesLoading,
      assigneeSearch,
      currentUser,
      parentIssues,
      parentIssuesLoading,
      parentIssueSearch,
      getAllowedParentTypeNames,
      updateTask,
      uploadAttachments,
      existingAttachments,
      initialAssignee,
      defaultFormValues,
    ],
  );

  return <EditTaskContextProvider value={value}>{children}</EditTaskContextProvider>;
}

export type JiraEditTaskProviderProps = {
  projectId: string;
  taskKey: string;
  task: JiraIssue;
  children: React.ReactNode;
};

export function JiraEditTaskProvider({
  projectId,
  taskKey,
  task,
  children,
}: JiraEditTaskProviderProps) {
  return (
    <JiraEditTaskProviderInner projectId={projectId} taskKey={taskKey} task={task}>
      {children}
    </JiraEditTaskProviderInner>
  );
}
