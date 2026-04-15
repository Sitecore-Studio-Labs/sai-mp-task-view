"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { ICreateTaskProvider } from "@/contexts/CreateTaskContext";
import { CreateTaskProvider as CreateTaskContextProvider } from "@/contexts/CreateTaskContext";
import { getParentTypeRulesForPlatform } from "@/helpers/parentTypeRules";
import { useAssignees } from "@/hooks/useAssignees";
import { useCreateTask } from "@/hooks/useCreateTask";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIssueTypes } from "@/hooks/useIssueTypes";
import { useParentTasks } from "@/hooks/useParentTasks";
import { usePriorities } from "@/hooks/usePriorities";
import { apiClient } from "@/lib/axiosClient";
import type {
  AssigneeOption,
  CreateTaskFormValues,
  CreateTaskPayload,
  IssueTypeOption,
  PriorityOption,
} from "@/types/create-task";
import type { PlatformType, PlatformUser } from "@/types/platform-entities";

const ASSIGNEE_SEARCH_DEBOUNCE_MS = 300;
const PARENT_ISSUE_SEARCH_DEBOUNCE_MS = 300;

const DEFAULT_FORM_VALUES: CreateTaskFormValues = {
  issueTypeId: "",
  summary: "",
  description: "",
  priority: "",
  parentIssueKey: "",
  assignee: "",
  dueDate: null,
};

function mapUserToAssignee(u: PlatformUser): AssigneeOption {
  return {
    id: u.id,
    displayName: u.displayName,
    avatarUrl: u.avatarUrl,
  };
}

function uploadAttachmentsBackground(taskKey: string, files: File[]): void {
  const attempt = (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient
      .post(`/platform/attachments?taskId=${encodeURIComponent(taskKey)}`, formData, {
        timeout: 95_000,
      })
      .then(() => {})
      .catch((err: { response?: { data?: { error?: string } }; message?: string }) => {
        const msg = err?.response?.data?.error ?? err?.message ?? "Upload failed.";
        toast.error(`Task ${taskKey} was created, but attaching "${file.name}" failed. ${msg}`, {
          action: { label: "Retry", onClick: () => attempt(file) },
        });
      });
  };
  void files.reduce<Promise<void>>(
    (prev, file) => prev.then(() => attempt(file)),
    Promise.resolve(),
  );
}

type CreateTaskProviderInnerProps = {
  projectId: string;
  projectKey: string;
  platform: PlatformType;
  children: React.ReactNode;
};

function CreateTaskProviderInner({
  projectId,
  projectKey,
  platform,
  children,
}: CreateTaskProviderInnerProps) {
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
  const { data: priorities = [] } = usePriorities(projectKey);
  const { data: assigneesRaw = [], isLoading: assigneesLoading } = useAssignees(
    projectId,
    assigneeSearchDebounced,
  );
  const { data: currentUserRaw } = useCurrentUser();
  const { data: parentIssuesRaw = [], isLoading: parentIssuesLoading } = useParentTasks(
    projectId,
    parentIssueSearchDebounced,
  );

  const createTask = useCreateTask();

  const issueTypesOptions: IssueTypeOption[] = useMemo(
    () => issueTypes.map((it) => ({ id: it.id, name: it.name, iconUrl: it.iconUrl })),
    [issueTypes],
  );

  const prioritiesOptions: PriorityOption[] = useMemo(
    () => priorities.map((p) => ({ id: p.id, name: p.name, iconUrl: p.iconUrl })),
    [priorities],
  );

  const assignees: AssigneeOption[] = useMemo(
    () => assigneesRaw.map(mapUserToAssignee),
    [assigneesRaw],
  );

  const currentUser: AssigneeOption | null = useMemo(
    () => (currentUserRaw ? mapUserToAssignee(currentUserRaw) : null),
    [currentUserRaw],
  );

  const createTaskMutation = useMemo(
    () => ({
      mutateAsync: async (payload: CreateTaskPayload) => {
        const task = await createTask.mutateAsync({
          projectId: payload.projectId,
          summary: payload.summary,
          description: payload.description,
          issueTypeId: payload.issueTypeId,
          priority: payload.priority,
          assignee: payload.assignee,
          dueDate: payload.dueDate,
          parentTaskKey: payload.parentIssueKey,
        });
        return {
          id: task.id,
          key: task.key,
          summary: task.summary,
          projectId: payload.projectId,
          projectKey,
        };
      },
      isPending: createTask.isPending,
      isError: createTask.isError,
      error: createTask.error as Error | null,
      reset: createTask.reset,
    }),
    [createTask, projectKey],
  );

  const uploadAttachments = useCallback((taskKey: string, files: File[]) => {
    uploadAttachmentsBackground(taskKey, files);
  }, []);

  const value: ICreateTaskProvider = useMemo(
    () => ({
      projectId,
      formTitle: "Create Task",
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
        getParentTypeRulesForPlatform(platform, childType),
      createTask: createTaskMutation,
      uploadAttachments,
      defaultFormValues: DEFAULT_FORM_VALUES,
    }),
    [
      projectId,
      platform,
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
      createTaskMutation,
      uploadAttachments,
    ],
  );

  return <CreateTaskContextProvider value={value}>{children}</CreateTaskContextProvider>;
}

export type CreateTaskProviderProps = {
  projectId: string;
  projectKey: string;
  platform: PlatformType;
  children: React.ReactNode;
};

export function CreateTaskProvider({
  projectId,
  projectKey,
  platform,
  children,
}: CreateTaskProviderProps) {
  return (
    <CreateTaskProviderInner projectId={projectId} projectKey={projectKey} platform={platform}>
      {children}
    </CreateTaskProviderInner>
  );
}
