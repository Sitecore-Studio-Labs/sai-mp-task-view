"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ErrorCard, LoadingCard } from "@/components/common/AsyncStateCards";
import { EditTaskView } from "@/components/tasks/EditTaskView";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { PLATFORM_TASKS_QUERY_KEY } from "@/hooks/useProjectTasks";
import { useTaskDetails } from "@/hooks/useTaskDetails";
import { EditTaskProvider } from "@/providers/edit-task/EditTaskProvider";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";

import { TaskDetails } from "./TaskDetails";

export function TaskDetailsContainer() {
  const [mode, setMode] = useState<"details" | "edit">("details");
  const queryClient = useQueryClient();

  const { effectiveProjectId, effectiveTaskKey, setSelectedTaskKey } = useTaskManager();

  const {
    data: task,
    isLoading,
    isError,
    refetch: refetchTask,
  } = useTaskDetails(effectiveTaskKey || "");

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
              <EditTaskProvider projectId={effectiveProjectId} taskKey={task.key} task={task}>
                <EditTaskView
                  onBack={() => setMode("details")}
                  onSuccess={() => {
                    queryClient.invalidateQueries({
                      queryKey: ["platform", "tasks", task.key],
                    });
                    queryClient.invalidateQueries({ queryKey: [...PLATFORM_TASKS_QUERY_KEY] });
                    setMode("details");
                  }}
                />
              </EditTaskProvider>
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
