"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ErrorCard, LoadingCard } from "@/components/common/AsyncStateCards";
import { EditTaskView } from "@/components/tasks/EditTaskView";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useIssueDetails } from "@/hooks/useIssueDetails";
import { JiraEditTaskProvider } from "@/providers/edit-task/JiraEditTaskProvider";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";

import { TaskDetails } from "./TaskDetails";

export function TaskDetailsContainer() {
  const [mode, setMode] = useState<"details" | "edit">("details");
  const queryClient = useQueryClient();

  const { effectiveProjectKey, effectiveProjectId, effectiveTaskKey, setSelectedTaskKey } =
    useTaskManager();

  const {
    data: task,
    isLoading,
    isError,
    refetch: refetchTask,
  } = useIssueDetails(effectiveTaskKey || "");

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setMode("details");
      setSelectedTaskKey(null);
    }
  };

  const handleEditTask = (taskKey: string) => {
    if (!taskKey) return;
    setSelectedTaskKey(taskKey);
    setMode("edit");
  };

  return (
    <Dialog open={!!effectiveTaskKey} onOpenChange={(open) => handleOpenChange(open)}>
      <DialogTitle className="sr-only">Task Details</DialogTitle>
      <DialogContent size="lg" className="w-[calc(100vw-2rem)] px-0 py-4">
        {isLoading && <LoadingCard message="Loading task…" isFlat />}
        {isError && (
          <ErrorCard
            message="Could not load task. Check your connection and try again."
            isFlat
            onRetry={refetchTask}
          />
        )}
        {!isLoading && !isError && (
          <div className="max-h-[90vh] overflow-y-auto">
            {mode === "details" && <TaskDetails task={task || null} onEditTask={handleEditTask} />}

            {mode === "edit" && task && effectiveProjectId && (
              <JiraEditTaskProvider projectId={effectiveProjectId} taskKey={task.key} task={task}>
                <EditTaskView
                  onBack={() => setMode("details")}
                  onSuccess={() => {
                    // Refresh detail view + task list after update.
                    queryClient.invalidateQueries({
                      queryKey: ["jira", "issues", task.key],
                    });
                    if (effectiveProjectKey) {
                      queryClient.invalidateQueries({
                        queryKey: ["jira", "boardIssues", effectiveProjectKey],
                      });
                    } else {
                      queryClient.invalidateQueries({ queryKey: ["jira", "boardIssues"] });
                    }
                    setMode("details");
                  }}
                />
              </JiraEditTaskProvider>
            )}

            {mode === "edit" && (!task || !effectiveProjectId) && (
              <ErrorCard message="Cannot edit task: missing task data or project context." />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
