"use client";

import { useEffect, useState } from "react";
import { useIssueDetails } from "@/hooks/useIssueDetails";
import { TaskDetails } from "./TaskDetails";
import { ErrorCard } from "@/components/common/AsyncStateCards";
import { Spinner } from "@/components/ui/spinner";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { DialogContent } from "@/components/ui/dialog";

interface TaskDetailsContainerProps {
  initialTaskKey: string | null;
  onOpenChange: (open: boolean) => void;
  onTaskDelete: () => void;
}

export function TaskDetailsContainer({
  initialTaskKey,
  onOpenChange,
  onTaskDelete,
}: TaskDetailsContainerProps) {
  const [currentTaskKey, setCurrentTaskKey] = useState<string | null>(
    initialTaskKey,
  );

  useEffect(() => {
    setCurrentTaskKey(initialTaskKey);
  }, [initialTaskKey]);

  const { data: task, isLoading, isError } = useIssueDetails(
    currentTaskKey || "",
  );

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      setCurrentTaskKey(null);
    }
    onOpenChange(open);
  };

  const handleTaskClick = (taskKey: string) => {
    setCurrentTaskKey(taskKey);
  };

  return (
    <Dialog
      open={!!currentTaskKey}
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
            <TaskDetails
              task={task || null}
              onTaskClick={handleTaskClick}
              onTaskDelete={onTaskDelete}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
