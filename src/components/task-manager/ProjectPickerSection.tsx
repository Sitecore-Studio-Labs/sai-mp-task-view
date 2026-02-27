"use client";

import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";
import { useJiraConnectionStatus } from "@/hooks/useJiraConnectionStatus";
import { ProjectPicker } from "@/components/projects";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { mdiPlus } from "@mdi/js";

export function ProjectPickerSection() {
  const { data: status } = useJiraConnectionStatus();
  const connected = status?.connected ?? false;

  const {
    projects,
    projectsLoading,
    effectiveProjectKey,
    selectedProjectKey,
    setSelectedProjectKey,
    goToCreate,
  } = useTaskManager();

  if (!connected) return null;

  return (
    <>
      <div className="space-y-2">
        <span className="text-sm font-medium text-neutral-fg block">
          Project
        </span>
        <ProjectPicker
          projects={projects}
          selectedProjectKey={selectedProjectKey}
          onSelectProject={setSelectedProjectKey}
          disabled={projectsLoading}
        />
      </div>
      <div className="flex items-center justify-end">
        <Button
          variant="outline"
          colorScheme="neutral"
          size="sm"
          disabled={!effectiveProjectKey || projectsLoading}
          onClick={goToCreate}
          className="font-normal"
        >
          <Icon path={mdiPlus} size="sm" />
          Create
        </Button>
      </div>
    </>
  );
}
