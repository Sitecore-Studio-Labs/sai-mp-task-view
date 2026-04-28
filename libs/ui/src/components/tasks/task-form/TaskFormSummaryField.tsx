"use client";

import type { CreateTaskFormValues } from "@mp/task-core";
import { Controller, useFormContext } from "react-hook-form";

import { Input } from "../../ui/input";
import { TaskFormField } from "./TaskFormField";

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
              {...field}
            />
          )}
        />
      )}
    </TaskFormField>
  );
}
