"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useIssueDetails } from "@/hooks/useIssueDetails";
import { TaskDetails } from "./TaskDetails";
import { ErrorCard } from "@/components/common/AsyncStateCards";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { DialogContent } from "@/components/ui/dialog";
import { JiraEditTaskProvider } from "@/providers/edit-task/JiraEditTaskProvider";
import { EditTaskView } from "@/components/tasks/EditTaskView";

interface TaskDetailsContainerProps {
  taskKey: string | null;
  projectKey: string | null;
  projectId: string | null;
  onSelectTaskKey: (taskKey: string | null) => void;
  onOpenChange: (open: boolean) => void;
  onTaskDelete: () => void;
}

export function TaskDetailsContainer({
  taskKey,
  projectKey,
  projectId,
  onSelectTaskKey,
  onOpenChange,
  onTaskDelete,
}: TaskDetailsContainerProps) {
  const [mode, setMode] = useState<"details" | "edit">("details");
  const queryClient = useQueryClient();

  const { data: task, isLoading, isError } = useIssueDetails(taskKey || "");

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setMode("details");
      onSelectTaskKey(null);
    }
    onOpenChange(open);
  };

  const handleTaskClick = (taskKey: string) => {
    onSelectTaskKey(taskKey);
    setMode("details");
  };

  const handleEditTask = (taskKey: string) => {
    if (!taskKey) return;
    onSelectTaskKey(taskKey);
    setMode("edit");
  };

  return (
    <Dialog
      open={!!taskKey}
      onOpenChange={(open) => handleOpenChange(open)}
    >
      <DialogTitle className="sr-only">Task Details</DialogTitle>
      <DialogContent size="lg" className="px-0 py-4 w-[calc(100vw-2rem)]">
        {isLoading && (
          <div className="flex justify-center items-center gap-3 py-8 text-muted-foreground text-sm">
            <Spinner className="size-5" />
            <span>Loading task…</span>
          </div>
        )}
        {isError && (
          <ErrorCard message="Could not load task. Check your connection and try again." />
        )}
        {!isLoading && !isError && (
          <div className="max-h-[90vh] overflow-y-auto">
            {mode === "details" && (
              <TaskDetails
                task={task || null}
                onTaskClick={handleTaskClick}
                onTaskDelete={onTaskDelete}
                onEditTask={handleEditTask}
              />
            )}

            {mode === "edit" && task && projectId && (
              <JiraEditTaskProvider projectId={projectId} taskKey={task.key} task={task}>
                <EditTaskView
                  onBack={() => setMode("details")}
                  onSuccess={() => {
                    // Refresh detail view + task list after update.
                    queryClient.invalidateQueries({
                      queryKey: ["jira", "issues", task.key],
                    });
                    if (projectKey) {
                      queryClient.invalidateQueries({
                        queryKey: ["jira", "boardIssues", projectKey],
                      });
                    } else {
                      queryClient.invalidateQueries({ queryKey: ["jira", "boardIssues"] });
                    }
                    setMode("details");
                  }}
                />
              </JiraEditTaskProvider>
            )}

            {mode === "edit" && (!task || !projectId) && (
              <ErrorCard message="Cannot edit task: missing task data or project context." />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
