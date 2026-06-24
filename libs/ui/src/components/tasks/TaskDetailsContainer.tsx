"use client";

import type { PlatformTask } from "@mp/task-core";
import { useTaskManager } from "@mp/task-core";
import { useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useState } from "react";

import { usePlatformIssueDetails } from "../../hooks/usePlatformIssueDetails";
import { ErrorCard, LoadingCard } from "../common/AsyncStateCards";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "../ui/dialog";
import { TaskDetails } from "./TaskDetails";

export interface EditProviderWrapperProps {
  projectId: string;
  taskKey: string;
  task: PlatformTask;
  children: ReactNode;
}

interface TaskDetailsContainerProps {
  editProviderWrapper?: (props: EditProviderWrapperProps) => ReactNode;
  editView?: (props: { onBack: () => void; onSuccess: () => void }) => ReactNode;
  /** Permission key for delete. Defaults to "DELETE_ISSUES". */
  deletePermissionKey?: string;
  /** Permission key for edit. Defaults to "EDIT_ISSUES". */
  editPermissionKey?: string;
}

export function TaskDetailsContainer({
  editProviderWrapper,
  editView,
  deletePermissionKey,
  editPermissionKey,
}: TaskDetailsContainerProps) {
  const [mode, setMode] = useState<"details" | "edit">("details");
  const queryClient = useQueryClient();

  const { effectiveProjectKey, effectiveProjectId, effectiveTaskKey, setSelectedTaskKey } =
    useTaskManager();

  const {
    data: task,
    isLoading,
    isError,
    refetch: refetchTask,
  } = usePlatformIssueDetails(effectiveTaskKey ?? "");

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
    <Dialog open={!!effectiveTaskKey} onOpenChange={handleOpenChange}>
      <DialogContent
        size="lg"
        className="w-[calc(100vw-2rem)] px-0 py-4"
        data-testid="task-details-panel"
      >
        <DialogTitle className="sr-only">Task Details</DialogTitle>
        <DialogDescription className="sr-only">
          View and manage the selected task.
        </DialogDescription>
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
            {mode === "details" && (
              <TaskDetails
                task={task ?? null}
                onEditTask={editProviderWrapper && editView ? handleEditTask : undefined}
                deletePermissionKey={deletePermissionKey}
                editPermissionKey={editPermissionKey}
              />
            )}

            {mode === "edit" && task && effectiveProjectId && editProviderWrapper && editView && (
              <>
                {editProviderWrapper({
                  projectId: effectiveProjectId,
                  taskKey: task.key,
                  task,
                  children: editView({
                    onBack: () => setMode("details"),
                    onSuccess: () => {
                      queryClient.invalidateQueries({
                        queryKey: ["platform", "issue", task.key],
                      });
                      if (effectiveProjectKey) {
                        queryClient.invalidateQueries({
                          queryKey: ["platform", "issues", effectiveProjectKey],
                        });
                      } else {
                        queryClient.invalidateQueries({ queryKey: ["platform", "issues"] });
                      }
                      setMode("details");
                    },
                  }),
                })}
              </>
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
