"use client";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Spinner } from "@/components/ui/spinner";
import type { CreateTaskMutation } from "@/contexts/CreateTaskContext";

type TaskFormActionsProps = {
  createTask: CreateTaskMutation;
  onBack: () => void;
  onRetry: () => void;
  /** Submit button label when idle (e.g. "Create Task" or "Save") */
  submitLabel?: string;
  /** Submit button label when submitting (e.g. "Creating…" or "Saving…") */
  submittingLabel?: string;
  /** Error message when mutation fails (e.g. "Failed to create task..." or "Failed to save task...") */
  errorFallbackMessage?: string;
};

export function TaskFormActions({
  createTask,
  onBack,
  onRetry,
  submitLabel = "Create Task",
  submittingLabel = "Creating…",
  errorFallbackMessage = "Failed to create task, please try again.",
}: TaskFormActionsProps) {
  const errorMessage = createTask.isError
    ? (createTask.error?.message ?? errorFallbackMessage)
    : null;

  return (
    <>
      {errorMessage && (
        <Alert variant="danger">
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>Error: {errorMessage}</span>
            <Button
              type="button"
              variant="link"
              size="sm"
              className="shrink-0"
              onClick={onRetry}
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
        <Button
          type="button"
          variant="outline"
          colorScheme="neutral"
          onClick={onBack}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          colorScheme="primary"
          disabled={createTask.isPending}
        >
          {createTask.isPending ? (
            <>
              <Spinner className="size-4" />
              {submittingLabel}
            </>
          ) : (
            submitLabel
          )}
        </Button>
      </div>
    </>
  );
}
