"use client";

import { mdiPlus } from "@mdi/js";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";

import { ProjectPickerSection } from "./ProjectPickerSection";
import { TaskListSection } from "./TaskListSection";

export function TaskManagerMainView() {
  const { effectiveProjectKey, projectsLoading, goToCreate, selectedSiteId, canCreateIssues } =
    useTaskManager();

  if (!selectedSiteId) return null;
  return (
    <div className="wrapper space-y-4">
      <ProjectPickerSection />
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
          Tasks
        </h2>
        <div title={canCreateIssues ? "Create new issue" : "No permission to create issues"}>
          <Button
            variant="outline"
            colorScheme="neutral"
            size="sm"
            disabled={!effectiveProjectKey || projectsLoading || !canCreateIssues}
            onClick={goToCreate}
            className="shrink-0 font-normal"
          >
            <Icon path={mdiPlus} size="sm" />
            Create
          </Button>
        </div>
      </div>
      <TaskListSection />
    </div>
  );
}
