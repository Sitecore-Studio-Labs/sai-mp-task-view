"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { IEditTaskProvider, UpdateTaskPayload } from "@/contexts/EditTaskContext";
import { EditTaskProvider as EditTaskContextProvider } from "@/contexts/EditTaskContext";
import { adfToPlainText } from "@/helpers/adfToPlainText";
import { useJiraAssignees } from "@/hooks/useJiraAssignees";
import { useJiraCurrentUser } from "@/hooks/useJiraCurrentUser";
import { useJiraIssueTypes } from "@/hooks/useJiraIssueTypes";
import { useJiraPriorities } from "@/hooks/useJiraPriorities";
import { useJiraProjectIssues } from "@/hooks/useJiraProjectIssues";
import { useUpdateJiraTask } from "@/hooks/useUpdateJiraTask";
import { apiClient } from "@/lib/axiosClient";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";
import type {
  AssigneeOption,
  CreateTaskFormValues,
  IssueTypeOption,
  ParentIssueOption,
  PriorityOption,
} from "@/types/create-task";
import type { JiraIssue, JiraIssueOption, JiraUser } from "@/types/jira";

const ASSIGNEE_SEARCH_DEBOUNCE_MS = 300;
const PARENT_ISSUE_SEARCH_DEBOUNCE_MS = 300;

function mapJiraUserToAssignee(u: JiraUser): AssigneeOption {
  return {
    id: u.accountId,
    displayName: u.displayName,
    avatarUrl: u.avatarUrls?.["24x24"],
  };
}

function mapJiraIssueToParentOption(i: JiraIssueOption): ParentIssueOption {
  return {
    id: i.id,
    key: i.key,
    summary: i.summary,
    issueType: i.issueType,
  };
}

/**
 * Jira-specific: allowed parent issue type names for a given child type.
 * For sub-tasks we only allow Story, Task, Bug (not other sub-tasks) so the
 * parent list only shows issues that can actually be parents and avoids
 * "pid: same project as parent" errors.
 */
function getAllowedParentIssueTypeNames(childIssueTypeName: string): Set<string> {
  const n = childIssueTypeName.toLowerCase();
  if (n.includes("subtask") || n === "sub-task") return new Set(["Story", "Task", "Bug"]);
  if (n.includes("story")) return new Set(["Epic"]);
  if (n.includes("task") && !n.includes("sub")) return new Set(["Epic"]);
  if (n.includes("bug")) return new Set(["Epic"]);
  return new Set();
}

/**
 * Upload Jira attachments sequentially (shows toast on failure with Retry).
 * Returns when all uploads have been attempted.
 */
async function uploadJiraAttachments(taskKey: string, files: File[]): Promise<void> {
  const attempt = async (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      await apiClient.post(
        `/jira/attachment/upload?issueIdOrKey=${encodeURIComponent(taskKey)}`,
        formData,
        {
          timeout: 95_000,
        },
      );
    } catch (err: unknown) {
      const e = err as {
        response?: { data?: { error?: string } };
        message?: string;
      };
      const msg = e?.response?.data?.error ?? e?.message ?? "Upload failed.";
      toast.error(`Task ${taskKey} was updated, but attaching "${file.name}" failed. ${msg}`, {
        action: {
          label: "Retry",
          onClick: () => {
            void attempt(file);
          },
        },
      });
    }
  };

  for (const file of files) {
    await attempt(file);
  }
}

function buildDefaultFormValues(task: JiraIssue): CreateTaskFormValues {
  return {
    issueTypeId: task.fields.issuetype?.id ?? "",
    summary: task.fields.summary ?? "",
    // Best-effort prefill; if unchanged we omit description in update payload.
    description: adfToPlainText(task.fields.description),
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
  const [assigneeSearchDebounced, setAssigneeSearchDebounced] = useState("");
  const [parentIssueSearch, setParentIssueSearch] = useState("");
  const [parentIssueSearchDebounced, setParentIssueSearchDebounced] = useState("");

  useEffect(() => {
    const t = setTimeout(
      () => setAssigneeSearchDebounced(assigneeSearch),
      ASSIGNEE_SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(t);
  }, [assigneeSearch]);

  useEffect(() => {
    const t = setTimeout(
      () => setParentIssueSearchDebounced(parentIssueSearch),
      PARENT_ISSUE_SEARCH_DEBOUNCE_MS,
    );
    return () => clearTimeout(t);
  }, [parentIssueSearch]);

  const projectKey = task.key?.split("-")[0] ?? "";
  const { projects } = useTaskManager();
  const taskProjectId =
    (projectKey ? projects.find((p) => p.key === projectKey)?.id : undefined) ?? projectId;
  const { data: issueTypes = [], isLoading: issueTypesLoading } = useJiraIssueTypes(
    taskProjectId ?? null,
  );
  const { data: priorities = [] } = useJiraPriorities(projectKey);
  const { data: assigneesRaw = [], isLoading: assigneesLoading } = useJiraAssignees(
    taskProjectId ?? null,
    assigneeSearchDebounced,
  );
  const { data: currentUserRaw } = useJiraCurrentUser();
  const { data: parentIssuesRaw = [], isLoading: parentIssuesLoading } = useJiraProjectIssues(
    projectKey || null,
    parentIssueSearchDebounced,
  );

  const updateJiraTask = useUpdateJiraTask(taskKey);

  const issueTypesOptions: IssueTypeOption[] = useMemo(
    () =>
      issueTypes.map((it) => ({
        id: it.id,
        name: it.name,
        iconUrl: it.iconUrl,
      })),
    [issueTypes],
  );

  const prioritiesOptions: PriorityOption[] = useMemo(
    () =>
      priorities.map((p) => ({
        id: p.id,
        name: p.name,
        iconUrl: p.iconUrl,
      })),
    [priorities],
  );

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
    () =>
      (task.fields.attachment ?? []).map((a) => ({
        id: a.id,
        filename: a.filename,
      })),
    [task.fields.attachment],
  );

  // Parent list is already scoped by projectKey (useJiraProjectIssues); exclude the issue being edited.
  const parentIssues: ParentIssueOption[] = useMemo(
    () => parentIssuesRaw.filter((i) => i.key !== task.key).map(mapJiraIssueToParentOption),
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
    await uploadJiraAttachments(key, files);
  }, []);

  const value: IEditTaskProvider = useMemo(
    () => ({
      projectId,
      taskKey,
      formTitle: "Edit Jira Task",
      issueTypes: issueTypesOptions,
      issueTypesLoading,
      priorities: prioritiesOptions,
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
      issueTypesOptions,
      issueTypesLoading,
      prioritiesOptions,
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
