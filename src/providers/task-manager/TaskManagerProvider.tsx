"use client";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { SYSTEMS } from "@/constants/systems";
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
import { SETUP_QUERY_KEY, useSetup } from "@/hooks/useSetup";
import { SETUP_MAPPINGS_QUERY_KEY } from "@/hooks/useSetupMappings";
import { setCurrentCloudId } from "@/lib/axiosClient";
import { JiraIssue, JiraPermission } from "@/types/jira";
import type { PageContextData } from "@/types/page-context";
import { JiraUserSetup } from "@/types/setup";

export type TaskManagerView = "main" | "create" | "preview";

type TaskManagerContextValue = {
  view: TaskManagerView;
  goToMain: () => void;
  goToCreate: () => void;
  goToPreview: (draftId: string) => void;
  backFromPreview: () => void;

  /**
   * The temporary project key selected by the user via the UI (not persisted to DB).
   * null means no override — the resolved default is used.
   */
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

  setup: JiraUserSetup | null;

  sites: Array<{ id: string; url: string; name: string }>;
  sitesLoading: boolean;
  hasMultipleSites: boolean;

  selectedSiteId: string | null;
  setSelectedSiteId: (id: string | null) => void;

  resolvedSiteId: string | null;
  resolvedProjectKey: string | null;

  resetTemporaryOverrides: () => void;
  hasTemporaryOverrides: boolean;
  isMappedSetup: boolean;

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
  const [selectedTaskKey, setSelectedTaskKey] = useState<string | null>(null);
  const [previewDraftId, setPreviewDraftId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    assignee: [] as string[],
    priority: [] as string[],
    status: [] as string[],
  });

  // Temporary project override (UI state only, not persisted to DB).
  const [selectedProjectKey, setSelectedProjectKey] = useState<string | null>(null);
  // Temporary site override (UI state only, not persisted to DB).
  const [temporarySiteId, setTemporarySiteId] = useState<string | null>(null);

  const { data: status } = useJiraConnectionStatus();
  const { data: { resources: sites = [] } = {}, isLoading: sitesLoading } = useJiraSites();
  const hasMultipleSites = sites.length > 1;

  const { data: setupData } = useSetup();
  const setup = setupData?.setup ?? null;

  const pageContext = usePageContext();

  // Resolve site and project from the current SAI page's mapping, falling back to setup defaults.
  const currentSaiSiteId = pageContext.siteInfo?.id as string | undefined;
  const currentSaiSiteName = pageContext.siteInfo?.name as string | undefined;

  const resolvedMapping = useMemo(() => {
    const mappings = setupData?.mappings ?? [];
    if (!currentSaiSiteId && !currentSaiSiteName) return null;
    return (
      mappings.find(
        (m) =>
          (currentSaiSiteId && m.sai_site_id === currentSaiSiteId) ||
          (currentSaiSiteName && m.sai_site_name === currentSaiSiteName),
      ) ?? null
    );
  }, [currentSaiSiteId, currentSaiSiteName, setupData?.mappings]);

  const resolvedSiteId = resolvedMapping?.jira_site_id ?? setup?.jira_site_id ?? null;
  const resolvedProjectKey =
    resolvedMapping?.jira_project_key ?? setup?.default_project_key ?? null;

  const effectiveSelectedSiteId = temporarySiteId ?? resolvedSiteId;

  // Keep the axios client's cloudId header in sync so all API calls target the correct Jira site.
  useEffect(() => {
    setCurrentCloudId(effectiveSelectedSiteId);
    return () => setCurrentCloudId(null);
  }, [effectiveSelectedSiteId]);

  const connected = status?.connected ?? false;

  // Load projects for the effective site so the picker reacts to temporary site changes.
  const {
    data: projects = [],
    isLoading: projectsLoading,
    isFetching: projectsFetching,
    isError: projectsError,
    refetch: refetchProjects,
    isRefetching: projectsRefetching,
  } = useJiraProjects(effectiveSelectedSiteId ?? undefined);

  const effectiveProjectKey = connected ? (selectedProjectKey ?? resolvedProjectKey ?? null) : null;

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

  const resetTemporaryOverrides = useCallback(() => {
    setTemporarySiteId(null);
    setSelectedProjectKey(null);
  }, []);

  const hasTemporaryOverrides = temporarySiteId !== null || selectedProjectKey !== null;
  const isMappedSetup = resolvedMapping !== null;

  useOAuthPopupHandler({
    platform: SYSTEMS.JIRA,
    invalidateKeys: [
      JIRA_STATUS_QUERY_KEY,
      JIRA_PROJECTS_QUERY_KEY,
      JIRA_SITES_QUERY_KEY,
      SETUP_QUERY_KEY,
      SETUP_MAPPINGS_QUERY_KEY,
    ],
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
      setup,
      sites,
      sitesLoading,
      hasMultipleSites,
      selectedSiteId: effectiveSelectedSiteId,
      setSelectedSiteId: setTemporarySiteId,
      resolvedSiteId,
      resolvedProjectKey,
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
      setup,
      sites,
      sitesLoading,
      hasMultipleSites,
      effectiveSelectedSiteId,
      resolvedSiteId,
      resolvedProjectKey,
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
