"use client";

import { useTaskManager } from "@mp/task-core";
import { useEffect, useMemo, useState } from "react";

import { extractUniqueStatuses } from "../../helpers/extractUniqueStatuses";
import { usePlatformAssignees } from "../../hooks/usePlatformAssignees";
import { usePlatformCurrentUser } from "../../hooks/usePlatformCurrentUser";
import { usePlatformPriorities } from "../../hooks/usePlatformPriorities";
import { usePlatformStatuses } from "../../hooks/usePlatformStatuses";
import { MultiSelectFilter, type MultiSelectOption } from "./elements/MultiSelectFilter";
import { PriorityBadge } from "./elements/PriorityBadge";
import { StatusBadge } from "./elements/StatusBadge";
import { UserAvatar } from "./elements/UserAvatar";

export type TaskListFiltersType = {
  assignee: MultiSelectOption[];
  priority: MultiSelectOption[];
  status: MultiSelectOption[];
};

export function TaskListFilters() {
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("");
  const [filters, setFilters] = useState<TaskListFiltersType>({
    assignee: [],
    priority: [],
    status: [],
  });

  const { effectiveProjectKey, setFilters: setTaskManagerFilters } = useTaskManager();

  useEffect(() => {
    setTaskManagerFilters({
      assignee: filters.assignee.map((a) => a.value),
      priority: filters.priority.map((p) => p.value),
      status: filters.status.map((s) => s.value),
    });
  }, [filters, setTaskManagerFilters]);

  const { data: statusesData } = usePlatformStatuses(effectiveProjectKey ?? undefined);
  const { data: prioritiesData, isLoading: prioritiesLoading } =
    usePlatformPriorities(effectiveProjectKey);
  const { data: assigneesData, isLoading: assigneesLoading } = usePlatformAssignees(
    effectiveProjectKey,
    assigneeSearchQuery,
  );
  const { data: currentUser } = usePlatformCurrentUser();

  const statuses = useMemo(() => extractUniqueStatuses(statusesData), [statusesData]);

  const statusOptions = useMemo(
    () =>
      statuses.map((status) => ({
        value: status.id ?? status.name ?? "",
        label: status.name ?? "",
        displayLabel: <StatusBadge status={status} />,
      })),
    [statuses],
  );

  const priorityOptions = useMemo(
    () =>
      prioritiesData?.map((priority) => ({
        value: priority.id ?? priority.name ?? "",
        label: priority.name ?? "",
        displayLabel: <PriorityBadge priority={priority} />,
      })) ?? [],
    [prioritiesData],
  );

  const assigneeOptions = useMemo(() => {
    const hasSearchQuery = assigneeSearchQuery.trim().length > 0;
    return [
      ...(!hasSearchQuery
        ? [
            {
              value: "unassigned",
              label: "Unassigned",
              displayLabel: (
                <UserAvatar
                  user={{ accountId: "unassigned", displayName: "Unassigned" }}
                  size="sm"
                  extended
                />
              ),
            },
          ]
        : []),
      ...(currentUser && !hasSearchQuery
        ? [
            {
              value: currentUser.accountId ?? "",
              label: currentUser.displayName ?? "",
              displayLabel: <UserAvatar user={currentUser} size="sm" extended />,
            },
          ]
        : []),
      ...(assigneesData?.map((assignee) => ({
        value: assignee.id,
        label: assignee.displayName ?? "",
        displayLabel: <UserAvatar user={assignee} size="sm" extended />,
      })) ?? []),
    ];
  }, [assigneesData, currentUser, assigneeSearchQuery]);

  const handleFilterChange = (
    key: "status" | "priority" | "assignee",
    values: MultiSelectOption[],
  ) => {
    setFilters({ ...filters, [key]: values });
  };

  const isPriorityDisabled = priorityOptions.length === 0;

  return (
    <div className="mb-4 grid w-full grid-cols-2 gap-2" data-testid="task-list-filters">
      <MultiSelectFilter
        options={statusOptions}
        selected={filters.status}
        onChange={(values) => handleFilterChange("status", values)}
        label="Status"
        placeholder="All statuses"
        testId="task-filter-status"
      />
      <MultiSelectFilter
        options={priorityOptions}
        selected={filters.priority}
        onChange={(values) => handleFilterChange("priority", values)}
        label="Priority"
        placeholder={prioritiesLoading || isPriorityDisabled ? "All priorities" : "All priorities"}
        testId="task-filter-priority"
      />
      <div className="col-span-2">
        <MultiSelectFilter
          options={assigneeOptions}
          selected={filters.assignee}
          onChange={(values) => handleFilterChange("assignee", values)}
          label="Assignee"
          placeholder="All assignees"
          withSearch
          onSearch={setAssigneeSearchQuery}
          loading={assigneesLoading}
          testId="task-filter-assignee"
        />
      </div>
    </div>
  );
}
