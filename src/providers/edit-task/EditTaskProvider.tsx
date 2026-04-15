"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { IEditTaskProvider, UpdateTaskPayload } from "@/contexts/EditTaskContext";
import { EditTaskProvider as EditTaskContextProvider } from "@/contexts/EditTaskContext";
import { getParentTypeRulesForPlatform } from "@/helpers/parentTypeRules";
import { useAssignees } from "@/hooks/useAssignees";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIssueTypes } from "@/hooks/useIssueTypes";
import { useParentTasks } from "@/hooks/useParentTasks";
import { usePriorities } from "@/hooks/usePriorities";
import { useUpdateTask } from "@/hooks/useUpdateTask";
import { apiClient } from "@/lib/axiosClient";
import type {
  AssigneeOption,
  CreateTaskFormValues,
  IssueTypeOption,
  PriorityOption,
} from "@/types/create-task";
import type { PlatformTask, PlatformUser } from "@/types/platform-entities";

const ASSIGNEE_SEARCH_DEBOUNCE_MS = 300;
const PARENT_ISSUE_SEARCH_DEBOUNCE_MS = 300;

function mapUserToAssignee(u: PlatformUser): AssigneeOption {
  return {
    id: u.id,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
  };
}

async function uploadAttachmentsBg(taskKey: string, files: File[]): Promise<void> {
  const attempt = async (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append("file", file);
    try {
      await apiClient.post(
        `/platform/attachments?taskId=${encodeURIComponent(taskKey)}`,
        formData,
        { timeout: 95_000 },
      );
    } catch (err: unknown) {
      const e = err as { response?: { data?: { error?: string } }; message?: string };
      const msg = e?.response?.data?.error ?? e?.message ?? "Upload failed.";
      toast.error(`Task ${taskKey} was updated, but attaching "${file.name}" failed. ${msg}`, {
        action: { label: "Retry", onClick: () => void attempt(file) },
      });
    }
  };
  for (const file of files) await attempt(file);
}

function buildDefaultFormValues(task: PlatformTask): CreateTaskFormValues {
  return {
    issueTypeId: task.issueType?.id ?? "",
    summary: task.summary ?? "",
    description: typeof task.description === "string" ? task.description : "",
    priority: task.priority?.id ?? "",
    parentIssueKey: task.parentKey ?? "",
    assignee: task.assignee?.id ?? "",
    dueDate: task.dueDate ? new Date(task.dueDate) : null,
  };
}

type EditTaskProviderInnerProps = {
  projectId: string;
  taskKey: string;
  task: PlatformTask;
  children: React.ReactNode;
};

function EditTaskProviderInner({ projectId, taskKey, task, children }: EditTaskProviderInnerProps) {
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

  const { data: issueTypes = [], isLoading: issueTypesLoading } = useIssueTypes(projectId);
  const { data: priorities = [] } = usePriorities(projectId);
  const { data: assigneesRaw = [], isLoading: assigneesLoading } = useAssignees(
    projectId,
    assigneeSearchDebounced,
  );
  const { data: currentUserRaw } = useCurrentUser();
  const { data: parentIssuesRaw = [], isLoading: parentIssuesLoading } = useParentTasks(
    projectId,
    parentIssueSearchDebounced,
    taskKey,
  );
  const updatePlatformTask = useUpdateTask(taskKey);

  const issueTypesOptions: IssueTypeOption[] = useMemo(
    () => issueTypes.map((it) => ({ id: it.id, name: it.name, iconUrl: it.iconUrl })),
    [issueTypes],
  );

  const prioritiesOptions: PriorityOption[] = useMemo(
    () => priorities.map((p) => ({ id: p.id, name: p.name, iconUrl: p.iconUrl })),
    [priorities],
  );

  const assignees: AssigneeOption[] = useMemo(() => {
    const list = assigneesRaw.map(mapUserToAssignee);
    const fromTask = task.assignee ? mapUserToAssignee(task.assignee) : null;
    if (!fromTask) return list;
    if (list.some((a) => a.id === fromTask.id)) return list;
    return [fromTask, ...list];
  }, [assigneesRaw, task.assignee]);

  const currentUser: AssigneeOption | null = useMemo(
    () => (currentUserRaw ? mapUserToAssignee(currentUserRaw) : null),
    [currentUserRaw],
  );

  const initialAssignee: AssigneeOption | null = useMemo(
    () => (task.assignee ? mapUserToAssignee(task.assignee) : null),
    [task.assignee],
  );

  const defaultFormValues = useMemo(() => buildDefaultFormValues(task), [task]);

  const updateTask = useMemo(
    () => ({
      mutateAsync: async (payload: UpdateTaskPayload) => updatePlatformTask.mutateAsync(payload),
      isPending: updatePlatformTask.isPending,
      isError: updatePlatformTask.isError,
      error: (updatePlatformTask.error as Error | null) ?? null,
      reset: updatePlatformTask.reset,
    }),
    [updatePlatformTask],
  );

  const uploadAttachments = useCallback(async (key: string, files: File[]) => {
    await uploadAttachmentsBg(key, files);
  }, []);

  const value: IEditTaskProvider = useMemo(
    () => ({
      projectId,
      taskKey,
      formTitle: "Edit Task",
      issueTypes: issueTypesOptions,
      issueTypesLoading,
      priorities: prioritiesOptions,
      assignees,
      assigneesLoading,
      assigneeSearch,
      setAssigneeSearch,
      currentUser,
      parentIssues: parentIssuesRaw,
      parentIssuesLoading,
      parentIssueSearch,
      setParentIssueSearch,
      getAllowedParentTypeNames: (childType: string) =>
        getParentTypeRulesForPlatform(task.platform, childType),
      updateTask,
      uploadAttachments,
      existingAttachments: task.attachments ?? [],
      initialAssignee,
      defaultFormValues,
    }),
    [
      projectId,
      taskKey,
      task.platform,
      issueTypesOptions,
      issueTypesLoading,
      prioritiesOptions,
      assignees,
      assigneesLoading,
      assigneeSearch,
      currentUser,
      parentIssuesRaw,
      parentIssuesLoading,
      parentIssueSearch,
      updateTask,
      uploadAttachments,
      task.attachments,
      initialAssignee,
      defaultFormValues,
    ],
  );

  return <EditTaskContextProvider value={value}>{children}</EditTaskContextProvider>;
}

export type EditTaskProviderProps = {
  projectId: string;
  taskKey: string;
  task: PlatformTask;
  children: React.ReactNode;
};

export function EditTaskProvider({ projectId, taskKey, task, children }: EditTaskProviderProps) {
  return (
    <EditTaskProviderInner projectId={projectId} taskKey={taskKey} task={task}>
      {children}
    </EditTaskProviderInner>
  );
}
