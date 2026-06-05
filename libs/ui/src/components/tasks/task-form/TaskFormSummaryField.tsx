"use client";

import type { CreateTaskFormValues } from "@mp/task-core";
import { TaskFormField } from "@mp/ui/components/tasks/task-form/TaskFormField";
import { Controller, useFormContext } from "react-hook-form";

import { Input } from "../../ui/input";

export function TaskFormSummaryField() {
  const {
    control,
    formState: { errors },
  } = useFormContext<CreateTaskFormValues>();
  const error = errors.summary?.message;

  return (
    <TaskFormField label="Summary *" htmlFor="summary" error={error}>
      {({ errorId }) => (
        <Controller
          name="summary"
          control={control}
          render={({ field }) => (
            <Input
              id="summary"
              placeholder="e.g. Design new homepage layout"
              className="border-(--color-blackAlpha-300)"
              aria-describedby={errorId ?? undefined}
              aria-invalid={Boolean(error)}
              data-testid="task-summary-field"
              {...field}
            />
          )}
        />
      )}
    </TaskFormField>
  );
}
