"use client";

import { Controller, useFormContext } from "react-hook-form";
import { mdiChevronDown } from "@mdi/js";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import type { CreateTaskFormValues } from "@/types/create-task";
import type { ParentIssueOption } from "@/types/create-task";
import { getIssueTypeIconPath } from "./create-task-utils";
import { cn } from "@/lib/utils";
import { TaskFormField } from "./TaskFormField";

type TaskFormParentIssueFieldProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  search: string;
  onSearchChange: (value: string) => void;
  parentIssuesLoading: boolean;
  filteredParentIssues: ParentIssueOption[];
  displayParentIssue: ParentIssueOption | null;
  selectedIssueTypeName: string;
  allowedParentTypeNames: Set<string>;
  onSelectParentIssue: (issue: ParentIssueOption | null) => void;
};

export function TaskFormParentIssueField({
  open,
  onOpenChange,
  search,
  onSearchChange,
  parentIssuesLoading,
  filteredParentIssues,
  displayParentIssue,
  selectedIssueTypeName,
  allowedParentTypeNames,
  onSelectParentIssue,
}: TaskFormParentIssueFieldProps) {
  const { control, formState: { errors } } = useFormContext<CreateTaskFormValues>();
  const error = errors.parentIssueKey?.message;

  return (
    <TaskFormField label="Parent issue" htmlFor="parentIssueKey" error={error}>
      {({ errorId }) => (
        <Controller
          name="parentIssueKey"
          control={control}
          render={({ field }) => (
          <Popover
            open={open}
            onOpenChange={(o) => {
              onOpenChange(o);
              if (!o) onSearchChange("");
            }}
          >
            <PopoverTrigger asChild>
              <Button
                id="parentIssueKey"
                type="button"
                variant="outline"
                colorScheme="neutral"
                className={cn(
                  "w-full justify-between h-10 rounded-md border border-(--color-blackAlpha-300) px-3 py-2 font-normal text-foreground",
                  !displayParentIssue && "text-muted-foreground",
                )}
                aria-describedby={errorId ?? undefined}
                aria-invalid={Boolean(error)}
              >
                {displayParentIssue ? (
                  <span className="flex items-center gap-2 truncate">
                    {displayParentIssue.issueType?.iconUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- platform issue type icon
                      <img
                        src={displayParentIssue.issueType.iconUrl}
                        alt=""
                        className="size-4 shrink-0 object-contain"
                      />
                    ) : (
                      <Icon
                        path={getIssueTypeIconPath(displayParentIssue.issueType?.name ?? "")}
                        size="sm"
                        className="shrink-0 text-muted-foreground"
                      />
                    )}
                    <span className="min-w-0 truncate font-mono text-sm">
                      {displayParentIssue.key} – {displayParentIssue.summary}
                    </span>
                  </span>
                ) : (
                  "None (standalone issue)"
                )}
                <Icon path={mdiChevronDown} size="default" className="shrink-0 opacity-50" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
              <Command filter={() => 1} className="rounded-lg border-0 shadow-none">
                <div className="flex items-center border-b px-2">
                  <Input
                    placeholder="Search by key or summary..."
                    value={search}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="h-9 border-0 shadow-none focus-visible:ring-0"
                  />
                </div>
                <CommandList className="max-h-64">
                  <CommandEmpty>
                    {parentIssuesLoading
                      ? "Searching..."
                      : allowedParentTypeNames.size === 0
                        ? selectedIssueTypeName
                          ? `${selectedIssueTypeName} does not support a parent.`
                          : "Select an issue type first."
                        : "No issues found."}
                  </CommandEmpty>
                  <CommandGroup>
                    <CommandItem
                      onSelect={() => {
                        field.onChange("");
                        onSelectParentIssue(null);
                        onOpenChange(false);
                      }}
                    >
                      <span className="text-muted-foreground">None (standalone issue)</span>
                    </CommandItem>
                    {filteredParentIssues.map((issue) => (
                      <CommandItem
                        key={issue.id}
                        value={`${issue.key}-${issue.summary}`}
                        onSelect={() => {
                          field.onChange(issue.key);
                          onSelectParentIssue(issue);
                          onOpenChange(false);
                        }}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          {issue.issueType?.iconUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element -- platform issue type icon
                            <img
                              src={issue.issueType.iconUrl}
                              alt=""
                              className="size-4 shrink-0 object-contain"
                            />
                          ) : (
                            <Icon
                              path={getIssueTypeIconPath(issue.issueType?.name ?? "")}
                              size="sm"
                              className="shrink-0 text-muted-foreground"
                            />
                          )}
                          <span className="font-mono text-sm shrink-0">{issue.key}</span>
                          <span className="truncate text-muted-foreground">{issue.summary}</span>
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </Command>
            </PopoverContent>
          </Popover>
        )}
      />
      )}
    </TaskFormField>
  );
}
