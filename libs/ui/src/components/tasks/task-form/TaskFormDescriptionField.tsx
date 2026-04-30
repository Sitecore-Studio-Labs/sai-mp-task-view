"use client";

import type { CreateTaskFormValues } from "@mp/task-core";
import { TaskFormField } from "@mp/ui/components/tasks/task-form/TaskFormField";
import { Controller, useFormContext } from "react-hook-form";

import { RichTextEditor } from "../../ui/rich-text-editor";

export function TaskFormDescriptionField() {
  const {
    control,
    formState: { errors },
  } = useFormContext<CreateTaskFormValues>();
  const error = errors.description?.message;

  return (
    <TaskFormField label="Description" htmlFor="description" error={error}>
      {() => (
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <RichTextEditor
              id="description"
              value={field.value}
              onChange={field.onChange}
              placeholder="Enter task description…"
              className="min-h-20 border-(--color-blackAlpha-300)"
            />
          )}
        />
      )}
    </TaskFormField>
  );
}
