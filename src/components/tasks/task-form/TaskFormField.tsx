"use client";

import { useId } from "react";
import { Label } from "@/components/ui/label";

type TaskFormFieldProps = {
  /** Label text (e.g. "Summary *") */
  label: string;
  /** id of the form control; used for Label htmlFor and optional aria-describedby on control */
  htmlFor: string;
  /** Error message to show below the control; also used for a11y (role="alert", id for aria-describedby) */
  error?: string | null;
  /** Render the control; receives errorId to set on the control as aria-describedby when there is an error */
  children: (a11y: { errorId: string | null }) => React.ReactNode;
};

/**
 * Shared wrapper for task form fields: label, control slot, and optional error with a11y.
 * Use for consistent layout and so screen readers announce errors via aria-describedby.
 */
export function TaskFormField({ label, htmlFor, error, children }: TaskFormFieldProps) {
  const errorId = useId();
  const hasError = Boolean(error);

  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children({ errorId: hasError ? errorId : null })}
      {hasError && (
        <p
          id={errorId}
          className="text-sm text-destructive"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
    </div>
  );
}
