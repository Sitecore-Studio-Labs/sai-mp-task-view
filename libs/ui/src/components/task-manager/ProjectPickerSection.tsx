"use client";

import { useTaskManager } from "@mp/task-core";
import { useCallback } from "react";

import { usePlatformSelectProject } from "../../hooks/usePlatformSelectProject";
import { ProjectPicker } from "../projects/ProjectPicker";

export function ProjectPickerSection() {
  const {
    connected,
    projects,
    projectsLoading,
    projectsFetching,
    effectiveProjectKey,
    setSelectedProjectKey,
  } = useTaskManager();

  const { mutate: selectProject } = usePlatformSelectProject();

  const handleProjectSelect = useCallback(
    (projectKey: string | null) => {
      if (!projectKey) return;
      if (connected && projectKey !== effectiveProjectKey) {
        selectProject(
          { projectKey },
          {
            onSuccess: () => setSelectedProjectKey(projectKey),
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
