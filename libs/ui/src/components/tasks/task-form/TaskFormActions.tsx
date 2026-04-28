"use client";

import { Alert, AlertDescription } from "../../ui/alert";
import { Button } from "../../ui/button";
import { Spinner } from "../../ui/spinner";

type TaskFormActionsProps = {
  mutation: {
    isPending: boolean;
    isError: boolean;
    error: Error | null;
  };
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
  mutation,
  onBack,
  onRetry,
  submitLabel = "Create Task",
  submittingLabel = "Creating…",
  errorFallbackMessage = "Failed to create task, please try again.",
}: TaskFormActionsProps) {
  const errorMessage = mutation.isError ? (mutation.error?.message ?? errorFallbackMessage) : null;

  return (
    <>
      {errorMessage && (
        <Alert variant="danger">
          <AlertDescription className="flex items-center justify-between gap-2">
            <span>Error: {errorMessage}</span>
            <Button type="button" variant="link" size="sm" className="shrink-0" onClick={onRetry}>
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
          disabled={mutation.isPending}
          onClick={onBack}
        >
          Cancel
        </Button>
        <Button type="submit" colorScheme="primary" disabled={mutation.isPending}>
          {mutation.isPending ? (
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
