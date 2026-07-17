"use client";

import { getTaskDisplayIdentifier, usePlatformCapabilities, useTaskManager } from "@mp/task-core";
import { useState } from "react";

import { usePlatformDeleteIssue } from "../../../hooks/usePlatformIssueManagement";
import { usePlatformPermissions } from "../../../hooks/usePlatformPermissions";
import { ErrorCard } from "../../common/AsyncStateCards";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from "../../ui/alert-dialog";
import { Button } from "../../ui/button";
import { Spinner } from "../../ui/spinner";

interface DeleteTaskButtonProps {
  taskKey: string;
  taskSummary?: string;
  /** Permission key checked before showing the delete button. Defaults to "DELETE_ISSUES". */
  deletePermissionKey?: string;
}

export function DeleteTaskButton({
  taskKey,
  taskSummary,
  deletePermissionKey = "DELETE_ISSUES",
}: DeleteTaskButtonProps) {
  const [open, setOpen] = useState(false);
  const { taskKeyDisplay = "key" } = usePlatformCapabilities();
  const { setSelectedTaskKey, effectiveProjectKey } = useTaskManager();
  const { mutate: deleteIssue, isPending, isError } = usePlatformDeleteIssue();
  const { data: permissionData } = usePlatformPermissions({
    permission: deletePermissionKey,
    projectKey: effectiveProjectKey,
  });
  const canDelete = permissionData?.hasPermission ?? false;
  const displayLabel = getTaskDisplayIdentifier(
    { key: taskKey, fields: { summary: taskSummary ?? "" } },
    taskKeyDisplay,
  );

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();
    deleteIssue(taskKey, {
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
          data-testid="open-delete-task-confirm"
        >
          Delete
        </Button>
      </div>

      <AlertDialog open={open} onOpenChange={setOpen}>
        <AlertDialogContent data-testid="delete-task-confirm-dialog">
          <AlertDialogTitle>Delete Task</AlertDialogTitle>
          {isError && <ErrorCard message="Something went wrong. Please try again." />}
          {!isError && (
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{displayLabel}</strong>? This action cannot be
              undone.
            </AlertDialogDescription>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending} data-testid="cancel-delete-task">
              Cancel
            </AlertDialogCancel>
            {!isError && (
              <AlertDialogAction
                onClick={handleDelete}
                disabled={isPending}
                data-testid="confirm-delete-task"
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
