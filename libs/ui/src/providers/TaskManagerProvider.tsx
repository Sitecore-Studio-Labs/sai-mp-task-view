"use client";

import {
  type PageContextData,
  type TaskFilters,
  TaskManagerContext,
  type TaskManagerContextValue,
} from "@mp/task-core";
import { type ReactNode, useCallback, useMemo, useState } from "react";

import { usePlatformConnectionStatus } from "../hooks/usePlatformConnectionStatus";
import { usePlatformIssues } from "../hooks/usePlatformIssues";
import { usePlatformPermissions } from "../hooks/usePlatformPermissions";
import { usePlatformProjects } from "../hooks/usePlatformProjects";
import { usePlatformSites } from "../hooks/usePlatformSites";

const EMPTY_PAGE_CONTEXT: PageContextData = {
  siteInfo: null,
  pageInfo: null,
  environment: null,
  isLoading: false,
  error: null,
};

interface TaskManagerProviderProps {
  children: ReactNode;
  /** Optional page context from the host application (e.g. Sitecore Pages). */
  pageContext?: PageContextData;
  /** Permission key for "can create" check. Defaults to "CREATE_ISSUES". */
  createPermissionKey?: string;
}

export function GenericTaskManagerProvider({
  children,
  pageContext = EMPTY_PAGE_CONTEXT,
  createPermissionKey = "CREATE_ISSUES",
}: TaskManagerProviderProps) {
  const [view, setView] = useState<TaskManagerContextValue["view"]>("main");
  const [selectedProjectKey, setSelectedProjectKey] = useState<string | null>(null);
  const [selectedTaskKey, setSelectedTaskKey] = useState<string | null>(null);
  const [previewDraftId, setPreviewDraftId] = useState<string | null>(null);
  const [selectedSiteId, setSelectedSiteId] = useState<string | null>(null);
  const [filters, setFilters] = useState<TaskFilters>({
    assignee: [],
    priority: [],
    status: [],
  });

  const { data: statusData } = usePlatformConnectionStatus();
  const connected = statusData?.connected ?? false;

  const { data: sitesData, isLoading: sitesLoading } = usePlatformSites();

  const sites = useMemo(() => sitesData?.resources ?? [], [sitesData]);
  const persistedSite = sitesData?.selectedSite ?? null;
  const persistedProject = sitesData?.selectedProject ?? null;

  const effectiveSelectedSiteId = selectedSiteId ?? persistedSite ?? null;

  const {
    data: projects = [],
    isLoading: projectsLoading,
    isFetching: projectsFetching,
    isError: projectsError,
    refetch: refetchProjects,
    isRefetching: projectsRefetching,
  } = usePlatformProjects();

  const effectiveProjectKey = connected ? (selectedProjectKey ?? persistedProject ?? null) : null;

  const effectiveProjectId = useMemo(
    () =>
      effectiveProjectKey
        ? (projects.find((p) => p.key === effectiveProjectKey)?.id ?? null)
        : null,
    [projects, effectiveProjectKey],
  );

  const {
    data: tasksData,
    isLoading: tasksLoading,
    isError: tasksError,
    hasNextPage: hasNextTasksPage,
    fetchNextPage: fetchNextTasksPage,
    isFetchingNextPage: isFetchingTasksNextPage,
    refetch: refetchTasks,
  } = usePlatformIssues(effectiveProjectKey, filters);

  const tasks = useMemo(() => tasksData?.pages?.flatMap((p) => p.issues ?? []) ?? [], [tasksData]);

  const effectiveTaskKey = connected ? selectedTaskKey : null;

  const { data: permissionData, isLoading: userPermissionLoading } = usePlatformPermissions({
    permission: createPermissionKey,
    projectKey: effectiveProjectKey,
  });
  const canCreateIssues = permissionData?.hasPermission ?? false;

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

  const value = useMemo<TaskManagerContextValue>(
    () => ({
      view,
      goToMain,
      goToCreate,
      goToPreview,
      backFromPreview,
      connected,
      selectedProjectKey,
      setSelectedProjectKey,
      effectiveProjectKey,
      effectiveProjectId,
      selectedTaskKey,
      setSelectedTaskKey,
      effectiveTaskKey,
      filters,
      setFilters,
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
      connected,
      selectedProjectKey,
      effectiveProjectKey,
      effectiveProjectId,
      selectedTaskKey,
      effectiveTaskKey,
      filters,
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
      canCreateIssues,
      userPermissionLoading,
      pageContext,
    ],
  );

  return <TaskManagerContext.Provider value={value}>{children}</TaskManagerContext.Provider>;
}
