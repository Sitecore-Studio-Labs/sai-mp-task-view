"use client";

import { ProjectPickerSection } from "./ProjectPickerSection";
import { TaskListSection } from "./TaskListSection";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { mdiPlus } from "@mdi/js";

export function TaskManagerMainView() {
  const { effectiveProjectKey, projectsLoading, goToCreate, selectedSiteId } =
    useTaskManager();

  if (!selectedSiteId) return null;
  return (
    <div className="wrapper space-y-4">
      <ProjectPickerSection />
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Tasks
        </h2>
        <Button
          variant="outline"
          colorScheme="neutral"
          size="sm"
          disabled={!effectiveProjectKey || projectsLoading}
          onClick={goToCreate}
          className="font-normal shrink-0"
        >
          <Icon path={mdiPlus} size="sm" />
          Create
        </Button>
      </div>
      <TaskListSection />
    </div>
  );
}
