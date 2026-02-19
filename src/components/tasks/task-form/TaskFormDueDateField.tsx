"use client";

import { format, startOfDay } from "date-fns";
import { mdiCalendarBlankOutline } from "@mdi/js";
import { Controller, useFormContext } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import type { CreateTaskFormValues } from "@/types/create-task";
import { cn } from "@/lib/utils";
import { TaskFormField } from "./TaskFormField";

type TaskFormDueDateFieldProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function TaskFormDueDateField({
  open,
  onOpenChange,
}: TaskFormDueDateFieldProps) {
  const { control, formState: { errors } } = useFormContext<CreateTaskFormValues>();
  const error = errors.dueDate?.message;

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
                    "w-full justify-start text-left h-10 rounded-md border border-(--color-blackAlpha-300) px-3 py-2 font-normal text-foreground",
                    !field.value && "text-muted-foreground",
                  )}
                  aria-describedby={errorId ?? undefined}
                  aria-invalid={Boolean(error)}
                >
                <Icon
                  path={mdiCalendarBlankOutline}
                  size="default"
                  className="text-muted-foreground shrink-0 opacity-60 font-light"
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
