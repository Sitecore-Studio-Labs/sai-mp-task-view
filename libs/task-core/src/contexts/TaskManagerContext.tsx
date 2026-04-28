"use client";

import { createContext, useContext } from "react";

import type { PageContextData } from "../types/page-context";
import type {
  PlatformProject,
  PlatformSite,
  PlatformTask,
  TaskFilters,
  TaskManagerView,
} from "../types/platform";

export interface TaskManagerContextValue {
  view: TaskManagerView;
  goToMain: () => void;
  goToCreate: () => void;
  goToPreview: (draftId: string) => void;
  backFromPreview: () => void;

  connected: boolean;

  selectedProjectKey: string | null;
  setSelectedProjectKey: (key: string | null) => void;
  effectiveProjectKey: string | null;
  effectiveProjectId: string | null;

  projects: PlatformProject[];
  projectsLoading: boolean;
  projectsFetching: boolean;
  projectsError: boolean;
  refetchProjects: () => void;
  projectsRefetching: boolean;

  selectedTaskKey: string | null;
  setSelectedTaskKey: (key: string | null) => void;
  effectiveTaskKey: string | null;

  filters: TaskFilters;
  setFilters: (filters: TaskFilters) => void;

  tasks: PlatformTask[];
  tasksLoading: boolean;
  tasksError: boolean;
  hasNextTasksPage: boolean;
  fetchNextTasksPage: () => void;
  isFetchingTasksNextPage: boolean;
  refetchTasks: () => void;

  sites: PlatformSite[];
  sitesLoading: boolean;
  selectedSiteId: string | null;
  setSelectedSiteId: (id: string | null) => void;

  previewDraftId: string | null;
  canCreateIssues: boolean;
  userPermissionLoading: boolean;

  pageContext: PageContextData;
}

export const TaskManagerContext = createContext<TaskManagerContextValue | null>(null);

export function useTaskManager(): TaskManagerContextValue {
  const ctx = useContext(TaskManagerContext);
  if (!ctx) throw new Error("useTaskManager must be used within a TaskManagerProvider");
  return ctx;
}
