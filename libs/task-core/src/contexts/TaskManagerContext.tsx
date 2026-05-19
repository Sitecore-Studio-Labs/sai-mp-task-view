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
import type { PlatformSetupMapping, PlatformSetupRecord } from "../types/platform-setup";

export interface TaskManagerContextValue {
  /** Whether the platform account is connected (OAuth/session valid). */
  connected: boolean;

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

  setup: PlatformSetupRecord | null;
  setupMappings: PlatformSetupMapping[];

  sites: PlatformSite[];
  sitesLoading: boolean;

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
}

export const TaskManagerContext = createContext<TaskManagerContextValue | null>(null);

export function useTaskManager(): TaskManagerContextValue {
  const ctx = useContext(TaskManagerContext);
  if (!ctx) throw new Error("useTaskManager must be used within a TaskManagerProvider");
  return ctx;
}
