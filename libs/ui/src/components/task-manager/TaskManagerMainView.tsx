"use client";

import { mdiPlus } from "@mdi/js";
import { useTaskManager } from "@mp/task-core";

import { Button } from "../ui/button";
import { Icon } from "../ui/icon";
import { ProjectPickerSection } from "./ProjectPickerSection";
import { TaskListSection } from "./TaskListSection";

interface TaskManagerMainViewProps {
  /** Slot for the task detail overlay (passed through to TaskListSection). */
  taskDetailsSlot?: React.ReactNode;
}

export function TaskManagerMainView({ taskDetailsSlot }: TaskManagerMainViewProps) {
  const {
    connected,
    selectedSiteId,
    effectiveProjectKey,
    projectsLoading,
    goToCreate,
    canCreateIssues,
    userPermissionLoading,
  } = useTaskManager();

  if (!connected || !selectedSiteId) return null;

  return (
    <div className="wrapper space-y-4">
      <ProjectPickerSection />
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-muted-foreground text-sm font-semibold tracking-wide uppercase">
          Tasks
        </h2>
        <div
          title={
            userPermissionLoading
              ? "Checking permissions..."
              : canCreateIssues
                ? "Create new issue"
                : "No permission to create issues"
          }
        >
          <Button
            variant="outline"
            colorScheme="neutral"
            size="sm"
            disabled={
              !effectiveProjectKey || projectsLoading || !canCreateIssues || userPermissionLoading
            }
            onClick={goToCreate}
            className="shrink-0 font-normal"
          >
            <Icon path={mdiPlus} size="sm" />
            Create
          </Button>
        </div>
      </div>
      <TaskListSection taskDetailsSlot={taskDetailsSlot} />
    </div>
  );
}
