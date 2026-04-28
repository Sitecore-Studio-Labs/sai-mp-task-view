"use client";

import type { CreateTaskFormValues, IssueTypeOption } from "@mp/task-core";
import { usePlatformCapabilities } from "@mp/task-core";
import { Controller, useFormContext } from "react-hook-form";

import { Icon } from "../../ui/icon";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
import { getIssueTypeIconPath } from "./create-task-utils";
import { TaskFormField } from "./TaskFormField";

type TaskFormIssueTypeFieldProps = {
  issueTypes: IssueTypeOption[];
  issueTypesLoading: boolean;
};

export function TaskFormIssueTypeField({
  issueTypes,
  issueTypesLoading,
}: TaskFormIssueTypeFieldProps) {
  const { hasIssueTypes } = usePlatformCapabilities();
  const {
    control,
    formState: { errors },
  } = useFormContext<CreateTaskFormValues>();
  const error = errors.issueTypeId?.message;

  if (!hasIssueTypes) return null;

  return (
    <TaskFormField label="Issue Type" htmlFor="issueTypeId" error={error}>
      {({ errorId }) => (
        <Controller
          name="issueTypeId"
          control={control}
          render={({ field }) => (
            <Select value={field.value} onValueChange={field.onChange} disabled={issueTypesLoading}>
              <SelectTrigger
                id="issueTypeId"
                className="text-foreground w-full border-(--color-blackAlpha-300) font-normal"
                aria-describedby={errorId ?? undefined}
                aria-invalid={Boolean(error)}
              >
                <SelectValue placeholder="Select issue type" />
              </SelectTrigger>
              <SelectContent>
                {issueTypes.map((it) => (
                  <SelectItem key={it.id} value={it.id}>
                    <span className="flex items-center gap-2">
                      {it.iconUrl ? (
                        <img src={it.iconUrl} alt="" className="size-4 shrink-0 object-contain" />
                      ) : (
                        <Icon
                          path={getIssueTypeIconPath(it.name)}
                          size="sm"
                          className="text-muted-foreground shrink-0"
                        />
                      )}
                      {it.name}
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
