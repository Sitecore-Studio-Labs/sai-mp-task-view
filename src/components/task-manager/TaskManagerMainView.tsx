"use client";

import { mdiPlus } from "@mdi/js";

import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { useJiraConnectionStatus } from "@/hooks/useJiraConnectionStatus";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";

import { TaskListSection } from "./TaskListSection";

export function TaskManagerMainView() {
  const {
    effectiveProjectKey,
    projectsLoading,
    goToCreate,
    selectedSiteId,
    canCreateIssues,
    userPermissionLoading,
  } = useTaskManager();

  const { data: status } = useJiraConnectionStatus();
  const connected = status?.connected ?? false;

  if (!connected || !selectedSiteId) return null;

  return (
    <div className="wrapper mt-4 space-y-4">
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
      <TaskListSection />
    </div>
  );
}
