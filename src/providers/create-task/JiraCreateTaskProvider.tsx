"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import type { ICreateTaskProvider } from "@/contexts/CreateTaskContext";
import { CreateTaskProvider as CreateTaskContextProvider } from "@/contexts/CreateTaskContext";
import { useCreateJiraTask } from "@/hooks/useCreateJiraTask";
import { useJiraAssignees } from "@/hooks/useJiraAssignees";
import { useJiraCurrentUser } from "@/hooks/useJiraCurrentUser";
import { useJiraIssueTypes } from "@/hooks/useJiraIssueTypes";
import { useJiraPriorities } from "@/hooks/useJiraPriorities";
import { useJiraProjectIssues } from "@/hooks/useJiraProjectIssues";
import { apiClient } from "@/lib/axiosClient";
import type {
  AssigneeOption,
  CreateTaskFormValues,
  CreateTaskPayload,
  IssueTypeOption,
  ParentIssueOption,
  PriorityOption,
} from "@/types/create-task";
import type { JiraIssueOption, JiraUser } from "@/types/jira";

import { useTaskManager } from "../task-manager/TaskManagerProvider";

const ASSIGNEE_SEARCH_DEBOUNCE_MS = 300;
const PARENT_ISSUE_SEARCH_DEBOUNCE_MS = 300;

const EMPTY_FORM_VALUES: CreateTaskFormValues = {
  issueTypeId: "",
  summary: "",
  description: "",
  priority: "",
  parentIssueKey: "",
  assignee: "",
  dueDate: null,
};

function buildDescriptionFromContext(
  siteInfo: { name?: string; displayName?: string } | null,
  pageInfo: {
    name?: string;
    displayName?: string;
    path?: string;
    route?: string;
    language?: string;
    layoutEditingKind?: string;
  } | null,
  environment: string | null,
): string {
  const lines: string[] = [];
  const siteName = siteInfo?.displayName || siteInfo?.name;
  if (siteName) lines.push(`Site: ${siteName}`);

  const pageName = pageInfo?.displayName || pageInfo?.name;
  if (pageName) lines.push(`Page: ${pageName}`);
  if (pageInfo?.path) lines.push(`Path: ${pageInfo.path}`);
  if (pageInfo?.route) lines.push(`Route: ${pageInfo.route}`);
  if (pageInfo?.language) lines.push(`Language: ${pageInfo.language}`);
  if (pageInfo?.layoutEditingKind)
    lines.push(`Layout Editing Kind: ${pageInfo.layoutEditingKind.toLowerCase()} layout`);
  if (environment) lines.push(`Environment: ${environment}`);

  if (lines.length === 0) return "";
  return `<ul>${lines.map((l) => `<li><p>${l}</p></li>`).join("")}</ul><p></p>`;
}

function buildSummaryPrefix(siteInfo: { name?: string } | null): string {
  const name = siteInfo?.name;

  if (!name) return "";
  return `${name} :: `;
}

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

/** Jira-specific: allowed parent issue type names for a given child type. */
function getAllowedParentIssueTypeNames(childIssueTypeName: string): Set<string> {
  const n = childIssueTypeName.toLowerCase();
  if (n.includes("subtask") || n === "sub-task")
    return new Set(["Story", "Task", "Bug", "Sub-task", "Subtask"]);
  if (n.includes("story")) return new Set(["Epic"]);
  if (n.includes("task") && !n.includes("sub")) return new Set(["Epic"]);
  if (n.includes("bug")) return new Set(["Epic"]);
  return new Set();
}

/** Upload Jira attachments in the background; shows toast on failure with Retry. */
function uploadJiraAttachments(taskKey: string, files: File[]): void {
  const attempt = (file: File): Promise<void> => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient
      .post(`/jira/attachment/upload?issueIdOrKey=${encodeURIComponent(taskKey)}`, formData, {
        timeout: 95_000,
      })
      .then(() => {})
      .catch((err: { response?: { data?: { error?: string } }; message?: string }) => {
        const msg = err?.response?.data?.error ?? err?.message ?? "Upload failed.";
        toast.error(`Task ${taskKey} was created, but attaching "${file.name}" failed. ${msg}`, {
          action: {
            label: "Retry",
            onClick: () => attempt(file),
          },
        });
      });
  };
  void files.reduce<Promise<void>>(
    (prev, file) => prev.then(() => attempt(file)),
    Promise.resolve(),
  );
}

type JiraCreateTaskProviderInnerProps = {
  projectId: string;
  projectKey: string;
  children: React.ReactNode;
};

function JiraCreateTaskProviderInner({
  projectId,
  projectKey,
  children,
}: JiraCreateTaskProviderInnerProps) {
  const { pageContext } = useTaskManager();
  const { siteInfo, pageInfo, environment } = pageContext;

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

  const { data: issueTypes = [], isLoading: issueTypesLoading } = useJiraIssueTypes(projectId);
  const { data: priorities = [] } = useJiraPriorities(projectKey);
  const { data: assigneesRaw = [], isLoading: assigneesLoading } = useJiraAssignees(
    projectId,
    assigneeSearchDebounced,
  );
  const { data: currentUserRaw } = useJiraCurrentUser();
  const { data: parentIssuesRaw = [], isLoading: parentIssuesLoading } = useJiraProjectIssues(
    projectKey || null,
    parentIssueSearchDebounced,
  );

  const createJiraTask = useCreateJiraTask();

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

  const assignees: AssigneeOption[] = useMemo(
    () => assigneesRaw.map(mapJiraUserToAssignee),
    [assigneesRaw],
  );

  const currentUser: AssigneeOption | null = useMemo(
    () => (currentUserRaw ? mapJiraUserToAssignee(currentUserRaw) : null),
    [currentUserRaw],
  );

  const parentIssues: ParentIssueOption[] = useMemo(
    () => parentIssuesRaw.map(mapJiraIssueToParentOption),
    [parentIssuesRaw],
  );

  const getAllowedParentTypeNames = useCallback(
    (childIssueTypeName: string) => getAllowedParentIssueTypeNames(childIssueTypeName),
    [],
  );

  const createTask = useMemo(
    () => ({
      mutateAsync: async (payload: CreateTaskPayload) => {
        const task = await createJiraTask.mutateAsync(payload);
        return {
          id: task.id,
          key: task.key,
          summary: task.summary,
          projectId: task.projectId,
          projectKey: task.projectKey,
        };
      },
      isPending: createJiraTask.isPending,
      isError: createJiraTask.isError,
      error: createJiraTask.error as Error | null,
      reset: createJiraTask.reset,
    }),
    [createJiraTask],
  );

  const uploadAttachments = useCallback((taskKey: string, files: File[]) => {
    uploadJiraAttachments(taskKey, files);
  }, []);

  const defaultFormValues: CreateTaskFormValues = useMemo(
    () => ({
      ...EMPTY_FORM_VALUES,
      summary: buildSummaryPrefix(siteInfo),
      description: buildDescriptionFromContext(siteInfo, pageInfo, environment),
    }),
    [siteInfo, pageInfo, environment],
  );

  const value: ICreateTaskProvider = useMemo(
    () => ({
      projectId,
      formTitle: "Create Jira Task",
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
      createTask,
      uploadAttachments,
      defaultFormValues,
    }),
    [
      projectId,
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
      createTask,
      uploadAttachments,
      defaultFormValues,
    ],
  );

  return <CreateTaskContextProvider value={value}>{children}</CreateTaskContextProvider>;
}

export type JiraCreateTaskProviderProps = {
  projectId: string;
  /** Project key (e.g. "KAN") for fetching parent-issue list; required for parent dropdown. */
  projectKey: string;
  children: React.ReactNode;
};

/**
 * Provides Jira-specific create-task data and actions to CreateTaskView.
 * Wrap CreateTaskView with this when the selected platform is Jira.
 */
export function JiraCreateTaskProvider({
  projectId,
  projectKey,
  children,
}: JiraCreateTaskProviderProps) {
  return (
    <JiraCreateTaskProviderInner projectId={projectId} projectKey={projectKey}>
      {children}
    </JiraCreateTaskProviderInner>
  );
}
