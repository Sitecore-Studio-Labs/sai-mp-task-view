"use client";

import { useState } from "react";

import { ErrorCard } from "@/components/common/AsyncStateCards";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useDeleteTask } from "@/hooks/useDeleteTask";
import { usePermission } from "@/hooks/useIssuePermission";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";
import { JiraPermission } from "@/types/jira";

interface DeleteTaskButtonProps {
  taskKey: string;
  onDeleted?: () => void;
}

export function DeleteTaskButton({ taskKey }: DeleteTaskButtonProps) {
  const [open, setOpen] = useState(false);
  const { setSelectedTaskKey } = useTaskManager();
  const { mutate: deleteTask, isPending, isError } = useDeleteTask();
  const { data: userPermission } = usePermission({
    issueIdOrKey: taskKey,
    permission: JiraPermission.DELETE,
  });
  const canDelete = userPermission?.hasPermission ?? false;

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();

    deleteTask(taskKey, {
      onSuccess: () => {
        setOpen(false);
        setSelectedTaskKey(null);
      },
    });
  };

  return (
    <>
      <div title={!canDelete ? "No permission to delete" : ""}>
        <Button
          variant="link"
          size="sm"
          colorScheme="danger"
          className="px-0"
          onClick={() => setOpen(true)}
          disabled={!canDelete}
        >
          Delete
        </Button>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>Delete Task</AlertDialogTitle>
          {isError && <ErrorCard message="Something went wrong. Please try again." />}
          {!isError && (
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{taskKey}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            {!isError && (
              <AlertDialogAction
                onClick={(e) => {
                  handleDelete(e);
                }}
                disabled={isPending}
              >
                {isPending ? <Spinner /> : "Delete"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
