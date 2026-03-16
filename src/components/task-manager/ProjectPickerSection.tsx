"use client";

import { ProjectPicker } from "@/components/projects";
import { useJiraConnectionStatus } from "@/hooks/useJiraConnectionStatus";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";

export function ProjectPickerSection() {
  const { data: status } = useJiraConnectionStatus();
  const connected = status?.connected ?? false;

  const { projects, projectsLoading, projectsFetching, selectedProjectKey, setSelectedProjectKey } =
    useTaskManager();

  if (!connected) return null;

  return (
    <div className="space-y-2">
      <span className="text-neutral-fg block text-sm font-medium">Project</span>
      <ProjectPicker
        projects={projects}
        selectedProjectKey={selectedProjectKey}
        onSelectProject={setSelectedProjectKey}
        disabled={projectsLoading || projectsFetching}
      />
    </div>
  );
}
