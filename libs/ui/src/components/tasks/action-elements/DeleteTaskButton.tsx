"use client";

import { useTaskManager } from "@mp/task-core";
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
  /** Permission key checked before showing the delete button. Defaults to "DELETE_ISSUES". */
  deletePermissionKey?: string;
}

export function DeleteTaskButton({
  taskKey,
  deletePermissionKey = "DELETE_ISSUES",
}: DeleteTaskButtonProps) {
  const [open, setOpen] = useState(false);
  const { setSelectedTaskKey, effectiveProjectKey } = useTaskManager();
  const { mutate: deleteIssue, isPending, isError } = usePlatformDeleteIssue();
  const { data: permissionData } = usePlatformPermissions({
    permission: deletePermissionKey,
    projectKey: effectiveProjectKey,
  });
  const canDelete = permissionData?.hasPermission ?? false;

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
              <AlertDialogAction onClick={handleDelete} disabled={isPending}>
                {isPending ? <Spinner /> : "Delete"}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
