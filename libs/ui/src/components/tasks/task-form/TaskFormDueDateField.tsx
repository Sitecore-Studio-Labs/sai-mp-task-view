"use client";

import { mdiCalendarBlankOutline } from "@mdi/js";
import { cn } from "@mp/shared";
import type { CreateTaskFormValues } from "@mp/task-core";
import { usePlatformCapabilities } from "@mp/task-core";
import { TaskFormField } from "@mp/ui/components/tasks/task-form/TaskFormField";
import { format, startOfDay } from "date-fns";
import { Controller, useFormContext } from "react-hook-form";

import { Button } from "../../ui/button";
import { Calendar } from "../../ui/calendar";
import { Icon } from "../../ui/icon";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";

type TaskFormDueDateFieldProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TaskFormDueDateField({ open, onOpenChange }: TaskFormDueDateFieldProps) {
  const { hasDueDate } = usePlatformCapabilities();
  const {
    control,
    formState: { errors },
  } = useFormContext<CreateTaskFormValues>();
  const error = errors.dueDate?.message;

  if (!hasDueDate) return null;

  return (
    <TaskFormField label="Due Date" htmlFor="dueDate" error={error}>
      {({ errorId }) => (
        <Controller
          name="dueDate"
          control={control}
          render={({ field }) => (
            <Popover open={open} onOpenChange={onOpenChange}>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  colorScheme="neutral"
                  id="dueDate"
                  className={cn(
                    "text-foreground h-10 w-full justify-start rounded-md border border-(--color-blackAlpha-300) px-3 py-2 text-left font-normal",
                    !field.value && "text-muted-foreground",
                  )}
                  aria-describedby={errorId ?? undefined}
                  aria-invalid={Boolean(error)}
                >
                  <Icon
                    path={mdiCalendarBlankOutline}
                    size="default"
                    className="text-muted-foreground shrink-0 font-light opacity-60"
                  />
                  {field.value ? format(field.value, "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={field.value ?? undefined}
                  onSelect={(d: Date | undefined) => {
                    field.onChange(d ?? null);
                    onOpenChange(false);
                  }}
                  disabled={{ before: startOfDay(new Date()) }}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          )}
        />
      )}
    </TaskFormField>
  );
}
