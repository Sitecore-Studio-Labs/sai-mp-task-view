"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  JIRA_PROJECTS_QUERY_KEY,
  JIRA_STATUS_QUERY_KEY,
} from "@/hooks/useJiraConnectionStatus";
import { useJiraConnectionStatus } from "@/hooks/useJiraConnectionStatus";
import { useJiraProjects } from "@/hooks/useJiraProjects";
import { useOAuthPopupHandler } from "@/hooks/useOAuthPopupHandler";
import { SYSTEMS } from "@/constants/systems";
import { JiraIssue } from "@/types/jira";
import { useProjectIssues } from "@/hooks/useProjectIssues";

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
  projectsError: boolean;
  refetchProjects: () => void;

  selectedTaskKey: string | null;
  setSelectedTaskKey: (key: string | null) => void;
  effectiveTaskKey: string | null;

  filters: {
    assignee: string[];
    priority: string[];
    status: string[];
  };
  setFilters: (filters: {
    assignee: string[];
    priority: string[];
    status: string[];
  }) => void;

  tasks: JiraIssue[];
  tasksLoading: boolean;
  tasksError: boolean;
  hasNextTasksPage: boolean;
  fetchNextTasksPage: () => void;
  isFetchingTasksNextPage: boolean;
  refetchTasks: () => void;

  previewDraftId: string | null;
};

const TaskManagerContext = createContext<TaskManagerContextValue | null>(null);

export function useTaskManager() {
  const ctx = useContext(TaskManagerContext);
  if (!ctx)
    throw new Error("useTaskManager must be used within TaskManagerProvider");
  return ctx;
}

export function TaskManagerProvider({ children }: { children: ReactNode }) {
  const [view, setView] = useState<TaskManagerView>("main");
  const [selectedProjectKey, setSelectedProjectKey] = useState<string | null>(
    null,
  );
  const [selectedTaskKey, setSelectedTaskKey] = useState<string | null>(null);
  const [previewDraftId, setPreviewDraftId] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    assignee: [] as string[],
    priority: [] as string[],
    status: [] as string[],
  });

  const { data: status } = useJiraConnectionStatus();
  const {
    data: projects = [],
    isLoading: projectsLoading,
    isError: projectsError,
    refetch: refetchProjects,
  } = useJiraProjects();
  const connected = status?.connected ?? false;

  const effectiveProjectKey = connected ? selectedProjectKey : null;
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
    () =>
      (tasksData?.pages?.flatMap((p) => p.issues ?? []) ?? []) as JiraIssue[],
    [tasksData],
  );

  const effectiveTaskKey = connected ? selectedTaskKey : null;

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

  useOAuthPopupHandler({
    platform: SYSTEMS.JIRA,
    invalidateKeys: [JIRA_STATUS_QUERY_KEY, JIRA_PROJECTS_QUERY_KEY],
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
      projectsError,
      refetchProjects,
      tasks,
      tasksLoading,
      tasksError,
      hasNextTasksPage,
      fetchNextTasksPage,
      isFetchingTasksNextPage,
      refetchTasks,
      previewDraftId,
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
      projectsError,
      refetchProjects,
      tasks,
      tasksLoading,
      tasksError,
      hasNextTasksPage,
      fetchNextTasksPage,
      isFetchingTasksNextPage,
      refetchTasks,
      previewDraftId,
    ],
  );

  return (
    <TaskManagerContext.Provider value={value}>
      {children}
    </TaskManagerContext.Provider>
  );
}
