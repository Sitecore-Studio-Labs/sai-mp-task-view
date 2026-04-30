"use client";

import type { CreateTaskFormValues } from "@mp/task-core";
import { usePlatformCapabilities } from "@mp/task-core";
import { TaskFormField } from "@mp/ui/components/tasks/task-form/TaskFormField";
import { Controller, useFormContext } from "react-hook-form";

import { RichTextEditor } from "../../ui/rich-text-editor";
import { Textarea } from "../../ui/textarea";

export function TaskFormDescriptionField() {
  const { richTextFormat } = usePlatformCapabilities();
  const {
    control,
    formState: { errors },
  } = useFormContext<CreateTaskFormValues>();
  const error = errors.description?.message;

  return (
    <TaskFormField label="Description" htmlFor="description" error={error}>
      {({ errorId }) => (
        <Controller
          name="description"
          control={control}
          render={({ field }) =>
            richTextFormat === "adf" ? (
              <RichTextEditor
                id="description"
                value={field.value}
                onChange={field.onChange}
                placeholder="Enter task description…"
                className="min-h-20 border-(--color-blackAlpha-300)"
              />
            ) : (
              <Textarea
                id="description"
                value={field.value ?? ""}
                onChange={field.onChange}
                placeholder="Enter task description…"
                className="min-h-20 resize-y border-(--color-blackAlpha-300)"
                aria-describedby={errorId ?? undefined}
                aria-invalid={Boolean(error)}
              />
            )
          }
        />
      )}
    </TaskFormField>
  );
}
