"use client";

import { SYSTEMS, TaskManagerContext, type TaskManagerContextValue } from "@mp/task-core";
import { type ReactNode, useCallback, useMemo, useState } from "react";

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
import { JiraPermission } from "@/types/jira";

// Re-export useTaskManager from @mp/task-core so existing imports of
// useTaskManager from this file continue to work without changes.
export type { TaskManagerView } from "@mp/task-core";
export { useTaskManager } from "@mp/task-core";

export function TaskManagerProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<TaskManagerContextValue["view"]>("main");
  const [selectedProjectKey, setSelectedProjectKey] = useState<string | null>(null);
  const [selectedTaskKey, setSelectedTaskKey] = useState<string | null>(null);
  const [previewDraftId, setPreviewDraftId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    assignee: [] as string[],
    priority: [] as string[],
    status: [] as string[],
  });

  const { data: status } = useJiraConnectionStatus();
  const connected = status?.connected ?? false;

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

  const tasks = useMemo(() => tasksData?.pages?.flatMap((p) => p.issues ?? []) ?? [], [tasksData]);

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
