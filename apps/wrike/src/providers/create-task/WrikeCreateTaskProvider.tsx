"use client";

import type {
  AssigneeOption,
  CreateTaskFormValues,
  CreateTaskPayload,
  ICreateTaskProvider,
} from "@mp/task-core";
import { CreateTaskProvider as CreateTaskContextProvider } from "@mp/task-core";
import {
  useDebounce,
  usePlatformAssignees,
  usePlatformCreateIssue,
  usePlatformCurrentUser,
  usePlatformPriorities,
  usePlatformProjectIssues,
  usePlatformUploadAttachments,
} from "@mp/ui";
import { useCallback, useMemo, useState } from "react";

import {
  getAllowedWrikeParentIssueTypeNames,
  mapWrikeUserToAssignee,
  PARENT_ISSUE_SEARCH_DEBOUNCE_MS,
} from "@/providers/shared/wrikeTaskProviderUtils";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";

const EMPTY_FORM_VALUES: CreateTaskFormValues = {
  issueTypeId: "",
  summary: "",
  description: "",
  priority: "",
  parentIssueKey: "",
  assignee: "",
  dueDate: null,
};

function buildSummaryPrefix(siteInfo: { name?: string } | null): string {
  const name = siteInfo?.name;
  if (!name) return "";
  return `${name} :: `;
}

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
  const { pageContext } = useTaskManager();
  const { siteInfo, pageInfo, environment } = pageContext;

  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [parentIssueSearch, setParentIssueSearch] = useState("");

  const assigneeSearchDebounced = useDebounce(assigneeSearch, 300);
  const parentIssueSearchDebounced = useDebounce(
    parentIssueSearch,
    PARENT_ISSUE_SEARCH_DEBOUNCE_MS,
  );

  const { data: priorities = [] } = usePlatformPriorities(projectKey);
  const { data: assigneesRaw = [], isLoading: assigneesLoading } = usePlatformAssignees(
    projectId,
    assigneeSearchDebounced,
  );
  const { data: currentUserRaw } = usePlatformCurrentUser();
  const { data: parentIssuesRaw = [], isLoading: parentIssuesLoading } = usePlatformProjectIssues(
    projectKey || null,
  );
  const parentIssues = useMemo(() => {
    const q = parentIssueSearchDebounced.trim().toLowerCase();
    if (!q) return parentIssuesRaw;
    return parentIssuesRaw.filter(
      (issue) => issue.key.toLowerCase().includes(q) || issue.summary.toLowerCase().includes(q),
    );
  }, [parentIssuesRaw, parentIssueSearchDebounced]);
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

  const getAllowedParentTypeNames = useCallback(
    (childIssueTypeName: string) => getAllowedWrikeParentIssueTypeNames(childIssueTypeName),
    [],
  );

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
      formTitle: "Create Wrike Task",
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
      createTask,
      uploadAttachments,
      defaultFormValues,
    }),
    [
      projectId,
      priorities,
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
