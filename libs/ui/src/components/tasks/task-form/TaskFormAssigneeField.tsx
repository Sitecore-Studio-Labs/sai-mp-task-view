"use client";

import { mdiChevronDown } from "@mdi/js";
import { cn } from "@mp/shared";
import type { AssigneeOption, CreateTaskFormValues } from "@mp/task-core";
import { usePlatformCapabilities } from "@mp/task-core";
import { useMemo } from "react";
import { Controller, useFormContext } from "react-hook-form";

import { Avatar, AvatarFallback, AvatarImage } from "../../ui/avatar";
import { Button } from "../../ui/button";
import { Command, CommandEmpty, CommandGroup, CommandItem, CommandList } from "../../ui/command";
import { Icon } from "../../ui/icon";
import { Input } from "../../ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { TaskFormField } from "./TaskFormField";

type TaskFormAssigneeFieldProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  search: string;
  onSearchChange: (value: string) => void;
  assignees: AssigneeOption[];
  assigneesLoading: boolean;
  displayAssignee: AssigneeOption | null;
  currentUser: AssigneeOption | null;
  onSelectAssignee: (user: AssigneeOption | null) => void;
};

export function TaskFormAssigneeField({
  open,
  onOpenChange,
  search,
  onSearchChange,
  assignees,
  assigneesLoading,
  displayAssignee,
  currentUser,
  onSelectAssignee,
}: TaskFormAssigneeFieldProps) {
  const { hasAssignees } = usePlatformCapabilities();
  const {
    control,
    formState: { errors },
  } = useFormContext<CreateTaskFormValues>();
  const error = errors.assignee?.message;

  const uniqueAssignees = useMemo(() => {
    const byId = new Map<string, AssigneeOption>();
    for (const user of assignees) {
      const normalized = {
        ...user,
        id: user.id?.trim() ?? "",
      };
      if (!normalized.id) continue;
      if (byId.has(normalized.id)) continue;
      byId.set(normalized.id, normalized);
    }
    return Array.from(byId.values());
  }, [assignees]);

  if (!hasAssignees) return null;

  return (
    <TaskFormField label="Assignee" htmlFor="assignee" error={error}>
      {({ errorId }) => (
        <Controller
          name="assignee"
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
                  id="assignee"
                  type="button"
                  variant="outline"
                  colorScheme="neutral"
                  className={cn(
                    "text-foreground h-10 w-full justify-between rounded-md border border-(--color-blackAlpha-300) px-3 py-2 font-normal",
                    !displayAssignee && "text-muted-foreground",
                  )}
                  aria-describedby={errorId ?? undefined}
                  aria-invalid={Boolean(error)}
                >
                  {displayAssignee ? (
                    <span className="flex items-center gap-2">
                      <Avatar className="size-5">
                        <AvatarImage src={displayAssignee.avatarUrl} />
                        <AvatarFallback className="text-xs">
                          {displayAssignee.displayName.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      {displayAssignee.displayName}
                    </span>
                  ) : (
                    "Search assignee..."
                  )}
                  <Icon path={mdiChevronDown} size="default" className="shrink-0 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-(--radix-popover-trigger-width) p-0" align="start">
                <div className="flex items-center justify-end border-b px-2 py-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      if (currentUser) {
                        field.onChange(currentUser.id);
                        onSelectAssignee(currentUser);
                        onOpenChange(false);
                      }
                    }}
                    className="text-primary text-sm hover:underline disabled:opacity-50"
                    disabled={!currentUser}
                  >
                    Assigned to me
                  </button>
                </div>
                <Command filter={() => 1} className="rounded-lg border-0 shadow-none">
                  <div className="flex items-center border-b px-2">
                    <Input
                      placeholder="Search by name..."
                      value={search}
                      onChange={(e) => onSearchChange(e.target.value)}
                      className="h-9 border-0 shadow-none focus-visible:ring-0"
                    />
                  </div>
                  <CommandList className="max-h-64">
                    {assigneesLoading ? (
                      <div className="text-muted-foreground py-6 text-center text-sm">
                        Searching…
                      </div>
                    ) : uniqueAssignees.length === 0 ? (
                      <CommandEmpty>No assignees found.</CommandEmpty>
                    ) : null}
                    <CommandGroup>
                      <CommandItem
                        key="__unassigned__"
                        value="__unassigned__"
                        keywords={["unassigned", "none"]}
                        onSelect={() => {
                          field.onChange("");
                          onSelectAssignee(null);
                          onOpenChange(false);
                        }}
                      >
                        <span className="text-muted-foreground">Unassigned</span>
                      </CommandItem>
                      {uniqueAssignees.map((u) => (
                        <CommandItem
                          key={u.id}
                          value={`${u.id} ${u.displayName}`}
                          keywords={[u.displayName, u.id]}
                          onSelect={() => {
                            field.onChange(u.id);
                            onSelectAssignee(u);
                            onOpenChange(false);
                          }}
                        >
                          <span className="flex items-center gap-2">
                            <Avatar className="size-5">
                              <AvatarImage src={u.avatarUrl} />
                              <AvatarFallback className="text-xs">
                                {u.displayName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            {u.displayName}
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
