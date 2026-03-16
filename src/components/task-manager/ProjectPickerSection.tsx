"use client";

import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";
import { useJiraConnectionStatus } from "@/hooks/useJiraConnectionStatus";
import { ProjectPicker } from "@/components/projects";

export function ProjectPickerSection() {
  const { data: status } = useJiraConnectionStatus();
  const connected = status?.connected ?? false;

  const {
    projects,
    projectsLoading,
    projectsFetching,
    selectedProjectKey,
    setSelectedProjectKey,
  } = useTaskManager();

  if (!connected) return null;

  return (
    <div className="space-y-2">
      <span className="text-sm font-medium text-neutral-fg block">Project</span>
      <ProjectPicker
        projects={projects}
        selectedProjectKey={selectedProjectKey}
        onSelectProject={setSelectedProjectKey}
        disabled={projectsLoading || projectsFetching}
      />
    </div>
  );
}
