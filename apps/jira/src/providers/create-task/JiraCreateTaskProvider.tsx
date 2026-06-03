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
  usePlatformCreateIssue,
  usePlatformIssueTypes,
  usePlatformPriorities,
  usePlatformProjectIssues,
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

import { useTaskManager } from "../task-manager/TaskManagerProvider";

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
  const [parentIssueSearch, setParentIssueSearch] = useState("");

  const assigneeSearchDebounced = useDebounce(assigneeSearch, ASSIGNEE_SEARCH_DEBOUNCE_MS);
  const parentIssueSearchDebounced = useDebounce(
    parentIssueSearch,
    PARENT_ISSUE_SEARCH_DEBOUNCE_MS,
  );

  const { data: issueTypes = [], isLoading: issueTypesLoading } = usePlatformIssueTypes(projectId);
  const { data: priorities = [] } = usePlatformPriorities(projectKey);
  const { data: assigneesRaw = [], isLoading: assigneesLoading } = useJiraAssignees(
    projectId,
    assigneeSearchDebounced,
  );
  const { data: currentUserRaw } = useJiraCurrentUser();
  const { data: parentIssues = [], isLoading: parentIssuesLoading } = usePlatformProjectIssues(
    projectKey || null,
    parentIssueSearchDebounced,
  );

  const createIssue = usePlatformCreateIssue();

  const assignees: AssigneeOption[] = useMemo(
    () => assigneesRaw.map(mapJiraUserToAssignee),
    [assigneesRaw],
  );

  const currentUser: AssigneeOption | null = useMemo(
    () => (currentUserRaw ? mapJiraUserToAssignee(currentUserRaw) : null),
    [currentUserRaw],
  );

  const getAllowedParentTypeNames = useCallback(
    (childIssueTypeName: string) => getAllowedParentIssueTypeNames(childIssueTypeName),
    [],
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

  const uploadAttachments = useCallback((taskKey: string, files: File[]) => {
    void uploadJiraAttachments(taskKey, files, "created");
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
      createTask,
      uploadAttachments,
      defaultFormValues,
    }),
    [
      projectId,
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
