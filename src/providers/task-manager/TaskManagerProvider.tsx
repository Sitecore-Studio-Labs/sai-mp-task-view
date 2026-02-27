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
  const [selectedProjectKey, setSelectedProjectKey] = useState<string | null>(null);
  const [previewDraftId, setPreviewDraftId] = useState<string | null>(null);

  const { data: status } = useJiraConnectionStatus();
  const { data: projects = [], isLoading: projectsLoading } = useJiraProjects();
  const connected = status?.connected ?? false;

  const effectiveProjectKey = connected ? selectedProjectKey : null;
  const effectiveProjectId = useMemo(() => {
    if (!effectiveProjectKey) return null;
    return projects.find((p) => p.key === effectiveProjectKey)?.id ?? null;
  }, [projects, effectiveProjectKey]);

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
      projects,
      projectsLoading,
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
      projects,
      projectsLoading,
      previewDraftId,
    ],
  );

  return (
    <TaskManagerContext.Provider value={value}>
      {children}
    </TaskManagerContext.Provider>
  );
}
