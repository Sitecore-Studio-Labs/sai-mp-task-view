"use client";

import { mdiFlag } from "@mdi/js";
import { Controller, useFormContext } from "react-hook-form";

import { Icon } from "@/components/ui/icon";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { CreateTaskFormValues, PriorityOption } from "@/types/create-task";

import { TaskFormField } from "./TaskFormField";

type TaskFormPriorityFieldProps = {
  priorities: PriorityOption[];
};

export function TaskFormPriorityField({ priorities }: TaskFormPriorityFieldProps) {
  const {
    control,
    formState: { errors },
  } = useFormContext<CreateTaskFormValues>();
  const error = errors.priority?.message;
  const isDisabled = priorities.length === 0;

  return (
    <TaskFormField label="Priority" htmlFor="priority" error={error}>
      {({ errorId }) => (
        <Controller
          name="priority"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={isDisabled}>
              <SelectTrigger
                id="priority"
                className="text-foreground w-full border-(--color-blackAlpha-300) font-normal"
                aria-describedby={errorId ?? undefined}
                aria-invalid={Boolean(error)}
                disabled={isDisabled}
              >
                <SelectValue
                  placeholder={isDisabled ? "No priorities available" : "Select priority"}
                />
              </SelectTrigger>
              <SelectContent>
                {priorities.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    <span className="flex items-center gap-2">
                      {p.iconUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element -- platform priority icon URL
                        <img src={p.iconUrl} alt="" className="size-4 object-contain" />
                      ) : (
                        <Icon path={mdiFlag} size="sm" className="text-muted-foreground" />
                      )}
                      {p.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        />
      )}
    </TaskFormField>
  );
}
