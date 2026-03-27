"use client";

import { useCallback } from "react";

import { ProjectPicker } from "@/components/projects";
import { useJiraConnectionStatus } from "@/hooks/useJiraConnectionStatus";
import { useJiraSelectProject } from "@/hooks/useJiraSelectProject";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";

export function ProjectPickerSection() {
  const { data: status } = useJiraConnectionStatus();
  const connected = status?.connected ?? false;

  const {
    projects,
    projectsLoading,
    projectsFetching,
    effectiveProjectKey,
    setSelectedProjectKey,
  } = useTaskManager();
  const { mutate: selectProject } = useJiraSelectProject();

  const handleProjectSelect = useCallback(
    (projectKey: string | null) => {
      if (!projectKey) return;

      if (connected && projectKey !== effectiveProjectKey) {
        selectProject(
          { projectKey },
          {
            onSuccess: () => {
              setSelectedProjectKey(projectKey);
            },
          },
        );
      }
    },
    [connected, effectiveProjectKey, selectProject, setSelectedProjectKey],
  );

  if (!connected) return null;

  return (
    <div className="space-y-2">
      <span className="text-neutral-fg block text-sm font-medium">Project</span>
      <ProjectPicker
        projects={projects}
        selectedProjectKey={effectiveProjectKey}
        onSelectProject={handleProjectSelect}
        disabled={projectsLoading || projectsFetching}
      />
    </div>
  );
}
