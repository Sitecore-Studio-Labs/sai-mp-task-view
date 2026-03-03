'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useDeleteIssue } from '@/hooks/useDeleteIssue';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Spinner } from '@/components/ui/spinner';
import { ErrorCard } from '@/components/common/AsyncStateCards';
import { useIssueDeletePermission } from '@/hooks/useIssueDeletePermission';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface DeleteTaskButtonProps {
  taskKey: string;
  onDeleted?: () => void;
}

export function DeleteTaskButton({
  taskKey,
  onDeleted,
}: DeleteTaskButtonProps) {
  const [open, setOpen] = useState(false);
  const { mutate: deleteIssue, isPending, isError } = useDeleteIssue();
  const { data: userPermission } = useIssueDeletePermission(taskKey);
  const canDelete = userPermission?.canDelete ?? false;

  const handleDelete = (e: React.MouseEvent) => {
    e.preventDefault();

    deleteIssue(taskKey, {
      onSuccess: () => {
        setOpen(false);
        onDeleted?.();
      },
    });
  };

  return (
    <>
      <div title={!canDelete ? 'No permission to delete' : ''}>
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
          {isError && (
            <ErrorCard message="Something went wrong. Please try again." />
          )}
          {!isError && (
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{taskKey}</strong>? This
              action cannot be undone.
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
                {isPending ? <Spinner /> : 'Delete'}
              </AlertDialogAction>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
