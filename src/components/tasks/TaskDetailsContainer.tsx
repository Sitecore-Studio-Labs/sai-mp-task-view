"use client";

import { useIssueDetails } from "@/hooks/useIssueDetails";
import { TaskDetails } from "./TaskDetails";
import { ErrorCard, LoadingCard } from "@/components/common/AsyncStateCards";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { DialogContent } from "@/components/ui/dialog";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";

export function TaskDetailsContainer() {
  const { effectiveTaskKey, setSelectedTaskKey } = useTaskManager();

  const {
    data: task,
    isLoading,
    isError,
  } = useIssueDetails(effectiveTaskKey || "");

  return (
    <Dialog
      open={!!effectiveTaskKey}
      onOpenChange={(open) => {
        if (!open) {
          setSelectedTaskKey(null);
        }
      }}
    >
      <DialogTitle className="sr-only">Task Details</DialogTitle>
      <DialogContent size="lg" className="px-0 py-4 w-[calc(100vw-2rem)]">
        {isLoading && <LoadingCard message="Loading task…" />}
        {isError && (
          <ErrorCard message="Could not load task. Check your connection and try again." />
        )}
        {!isLoading && !isError && (
          <div className="max-h-[90vh] overflow-y-auto">
            <TaskDetails task={task || null} />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
