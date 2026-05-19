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
import { usePlatformSetup } from "../hooks/usePlatformSetup";
import { usePlatformSites } from "../hooks/usePlatformSites";

const EMPTY_PAGE_CONTEXT: PageContextData = {
  siteInfo: null,
  pageInfo: null,
  environment: null,
  isLoading: false,
  error: null,
};

function getCurrentExternalResourceId(pageContext: PageContextData): string | null {
  const siteInfo = pageContext.siteInfo as {
    id?: unknown;
    siteId?: unknown;
    name?: unknown;
    displayName?: unknown;
  } | null;
  if (!siteInfo) return null;

  const candidate = siteInfo.id ?? siteInfo.siteId ?? siteInfo.name ?? siteInfo.displayName;
  return typeof candidate === "string" && candidate.trim() ? candidate : null;
}

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

  const { data: setupData } = usePlatformSetup();
  const setup = connected ? (setupData?.setup ?? null) : null;
  const setupMappings = useMemo(
    () => (connected ? (setupData?.mappings ?? []) : []),
    [connected, setupData?.mappings],
  );
  const currentExternalResourceId = useMemo(
    () => getCurrentExternalResourceId(pageContext),
    [pageContext],
  );
  const currentSetupMapping = useMemo(
    () =>
      currentExternalResourceId
        ? (setupMappings.find(
            (mapping) => mapping.externalResourceId === currentExternalResourceId,
          ) ?? null)
        : null,
    [currentExternalResourceId, setupMappings],
  );

  const configuredSiteId = currentSetupMapping?.siteId ?? setup?.siteId ?? persistedSite ?? null;
  const effectiveSelectedSiteId = selectedSiteId ?? configuredSiteId;

  const {
    data: projects = [],
    isLoading: projectsLoading,
    isFetching: projectsFetching,
    isError: projectsError,
    refetch: refetchProjects,
    isRefetching: projectsRefetching,
  } = usePlatformProjects(effectiveSelectedSiteId ?? undefined);

  const configuredProjectKey =
    currentSetupMapping?.projectKey ?? setup?.defaultProjectKey ?? persistedProject ?? null;
  const effectiveProjectKey = connected ? (selectedProjectKey ?? configuredProjectKey) : null;

  const configuredProjectId =
    effectiveProjectKey === currentSetupMapping?.projectKey
      ? currentSetupMapping.projectId
      : effectiveProjectKey === setup?.defaultProjectKey
        ? setup.defaultProjectId
        : null;

  const effectiveProjectId = useMemo(() => {
    if (!effectiveProjectKey) return null;
    return configuredProjectId ?? projects.find((p) => p.key === effectiveProjectKey)?.id ?? null;
  }, [configuredProjectId, projects, effectiveProjectKey]);

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

  const resetTemporaryOverrides = useCallback(() => {
    setSelectedSiteId(null);
    setSelectedProjectKey(null);
  }, []);

  const hasTemporaryOverrides = selectedSiteId !== null || selectedProjectKey !== null;
  const isMappedSetup = currentSetupMapping !== null;

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
      setup,
      setupMappings,
      previewDraftId,
      sites,
      sitesLoading,
      selectedSiteId: effectiveSelectedSiteId,
      setSelectedSiteId,
      resolvedSiteId: configuredSiteId,
      resolvedProjectKey: configuredProjectKey,
      resetTemporaryOverrides,
      hasTemporaryOverrides,
      isMappedSetup,
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
      setup,
      setupMappings,
      previewDraftId,
      sites,
      sitesLoading,
      effectiveSelectedSiteId,
      configuredSiteId,
      configuredProjectKey,
      resetTemporaryOverrides,
      hasTemporaryOverrides,
      isMappedSetup,
      canCreateIssues,
      userPermissionLoading,
      pageContext,
    ],
  );

  return <TaskManagerContext.Provider value={value}>{children}</TaskManagerContext.Provider>;
}
