"use client";

import { useEffect, useState } from "react";
import { useIssueDetails } from "@/hooks/useIssueDetails";
import { TaskDetails } from "./TaskDetails";
import { LoadingCard, ErrorCard } from "@/components/common/AsyncStateCards";
import { Dialog, DialogTitle } from "@/components/ui/dialog";
import { DialogContent } from "@/components/ui/dialog";

interface TaskDetailsContainerProps {
  initialTaskKey: string | null;
  onOpenChange: (open: boolean) => void;
}

export function TaskDetailsContainer({
  initialTaskKey,
  onOpenChange,
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
        {isLoading && <LoadingCard message="Loading task…" />}
        {isError && (
          <ErrorCard message="Could not load task. Check your connection and try again." />
        )}
        {!isLoading && !isError && (
          <div className="max-h-[90vh] overflow-y-auto">
            <TaskDetails
              task={task || null}
              onTaskClick={handleTaskClick}
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
