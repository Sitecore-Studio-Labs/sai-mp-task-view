"use client";

import type { PageContextData } from "@mp/task-core";
import { SYSTEMS } from "@mp/task-core";
import { createContext, type ReactNode, useCallback, useContext, useMemo, useState } from "react";

import { usePermission } from "@/hooks/useIssuePermission";
import {
  JIRA_PROJECTS_QUERY_KEY,
  JIRA_SITES_QUERY_KEY,
  JIRA_STATUS_QUERY_KEY,
  useJiraConnectionStatus,
} from "@/hooks/useJiraConnectionStatus";
import { useJiraProjects } from "@/hooks/useJiraProjects";
import { useJiraSites } from "@/hooks/useJiraSites";
import { useOAuthPopupHandler } from "@/hooks/useOAuthPopupHandler";
import { usePageContext } from "@/hooks/usePageContext";
import { useProjectIssues } from "@/hooks/useProjectIssues";
import { JiraIssue, JiraPermission } from "@/types/jira";

export type TaskManagerView = "main" | "create" | "preview";

type TaskManagerContextValue = {
  view: TaskManagerView;
  goToMain: () => void;
  goToCreate: () => void;
  goToPreview: (draftId: string) => void;
  backFromPreview: () => void;

  selectedProjectKey: string | null;
  setSelectedProjectKey: (key: string | null) => void;
  effectiveProjectKey: string | null;
  effectiveProjectId: string | null;

  projects: Array<{ id: string; key: string; name: string }>;
  projectsLoading: boolean;
  projectsFetching: boolean;
  projectsError: boolean;
  refetchProjects: () => void;
  projectsRefetching: boolean;

  selectedTaskKey: string | null;
  setSelectedTaskKey: (key: string | null) => void;
  effectiveTaskKey: string | null;

  filters: {
    assignee: string[];
    priority: string[];
    status: string[];
  };
  setFilters: (filters: { assignee: string[]; priority: string[]; status: string[] }) => void;

  tasks: JiraIssue[];
  tasksLoading: boolean;
  tasksError: boolean;
  hasNextTasksPage: boolean;
  fetchNextTasksPage: () => void;
  isFetchingTasksNextPage: boolean;
  refetchTasks: () => void;

  sites: Array<{ id: string; url: string; name: string }>;
  sitesLoading: boolean;
  selectedSiteId: string | null;
  setSelectedSiteId: (id: string | null) => void;

  previewDraftId: string | null;
  canCreateIssues: boolean;
  userPermissionLoading: boolean;

  pageContext: PageContextData;
};

const TaskManagerContext = createContext<TaskManagerContextValue | null>(null);

export function useTaskManager() {
  const ctx = useContext(TaskManagerContext);
  if (!ctx) throw new Error("useTaskManager must be used within TaskManagerProvider");
  return ctx;
}

export function TaskManagerProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<TaskManagerView>("main");
  const [selectedProjectKey, setSelectedProjectKey] = useState<string | null>(null);
  const [selectedTaskKey, setSelectedTaskKey] = useState<string | null>(null);
  const [previewDraftId, setPreviewDraftId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    assignee: [] as string[],
    priority: [] as string[],
    status: [] as string[],
  });

  const { data: status } = useJiraConnectionStatus();
  const {
    data: { resources: sites = [], selectedSite, selectedProject } = {},
    isLoading: sitesLoading,
  } = useJiraSites();

  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);

  const effectiveSelectedSiteId = selectedSiteId ?? selectedSite ?? null;

  const {
    data: projects = [],
    isLoading: projectsLoading,
    isFetching: projectsFetching,
    isError: projectsError,
    refetch: refetchProjects,
    isRefetching: projectsRefetching,
  } = useJiraProjects();
  const connected = status?.connected ?? false;

  const effectiveProjectKey = connected ? (selectedProjectKey ?? selectedProject ?? null) : null;
  const effectiveProjectId = useMemo(() => {
    if (!effectiveProjectKey) return null;
    return projects.find((p) => p.key === effectiveProjectKey)?.id ?? null;
  }, [projects, effectiveProjectKey]);

  const {
    data: tasksData,
    isLoading: tasksLoading,
    isError: tasksError,
    hasNextPage: hasNextTasksPage,
    fetchNextPage: fetchNextTasksPage,
    isFetchingNextPage: isFetchingTasksNextPage,
    refetch: refetchTasks,
  } = useProjectIssues(effectiveProjectKey, filters);

  const tasks = useMemo(
    () => (tasksData?.pages?.flatMap((p) => p.issues ?? []) ?? []) as JiraIssue[],
    [tasksData],
  );

  const effectiveTaskKey = connected ? selectedTaskKey : null;

  const { data: userPermission, isLoading: userPermissionLoading } = usePermission({
    permission: JiraPermission.CREATE,
    projectKey: effectiveProjectKey,
  });
  const canCreateIssues = userPermission?.hasPermission ?? false;

  const goToMain = useCallback(() => setView("main"), []);
  const goToCreate = useCallback(() => setView("create"), []);
  const goToPreview = useCallback((draftId: string) => {
    setPreviewDraftId(draftId);
    setView("preview");
  }, []);
  const backFromPreview = useCallback(() => {
    setPreviewDraftId(null);
    setView("create");
  }, []);

  const pageContext = usePageContext();

  useOAuthPopupHandler({
    platform: SYSTEMS.JIRA,
    invalidateKeys: [JIRA_STATUS_QUERY_KEY, JIRA_PROJECTS_QUERY_KEY, JIRA_SITES_QUERY_KEY],
    successMessage: "Jira connected successfully.",
  });

  const value = useMemo<TaskManagerContextValue>(
    () => ({
      view,
      goToMain,
      goToCreate,
      goToPreview,
      backFromPreview,
      selectedProjectKey,
      setSelectedProjectKey,
      effectiveProjectKey,
      effectiveProjectId,
      selectedTaskKey,
      filters,
      setFilters,
      setSelectedTaskKey,
      effectiveTaskKey,
      projects,
      projectsLoading,
      projectsFetching,
      projectsError,
      refetchProjects,
      projectsRefetching,
      tasks,
      tasksLoading,
      tasksError,
      hasNextTasksPage,
      fetchNextTasksPage,
      isFetchingTasksNextPage,
      refetchTasks,
      previewDraftId,
      sites,
      sitesLoading,
      selectedSiteId: effectiveSelectedSiteId,
      setSelectedSiteId,
      canCreateIssues,
      userPermissionLoading,
      pageContext,
    }),
    [
      view,
      goToMain,
      goToCreate,
      goToPreview,
      backFromPreview,
      selectedProjectKey,
      effectiveProjectKey,
      effectiveProjectId,
      filters,
      setFilters,
      selectedTaskKey,
      effectiveTaskKey,
      projects,
      projectsLoading,
      projectsFetching,
      projectsError,
      refetchProjects,
      projectsRefetching,
      tasks,
      tasksLoading,
      tasksError,
      hasNextTasksPage,
      fetchNextTasksPage,
      isFetchingTasksNextPage,
      refetchTasks,
      previewDraftId,
      sites,
      sitesLoading,
      effectiveSelectedSiteId,
      setSelectedSiteId,
      canCreateIssues,
      userPermissionLoading,
      pageContext,
    ],
  );

  return <TaskManagerContext.Provider value={value}>{children}</TaskManagerContext.Provider>;
}
