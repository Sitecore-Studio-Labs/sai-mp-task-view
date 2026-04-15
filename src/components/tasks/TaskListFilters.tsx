"use client";

import { useEffect, useMemo, useState } from "react";

import { useAssignees } from "@/hooks/useAssignees";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { usePriorities } from "@/hooks/usePriorities";
import { useProjectStatuses } from "@/hooks/useProjectStatuses";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";

import { MultiSelectFilter, type MultiSelectOption } from "./elements/MultiSelectFilter";
import { PriorityBadge } from "./elements/PriorityBadge";
import { StatusBadge } from "./elements/StatusBadge";
import { UserAvatar } from "./elements/UserAvatar";

export type TaskListFiltersType = {
  assignee: MultiSelectOption[];
  priority: MultiSelectOption[];
  status: MultiSelectOption[];
};

export default function TaskListFilters() {
  const [assigneeSearchQuery, setAssigneeSearchQuery] = useState("");

  const [filters, setFilters] = useState<TaskListFiltersType>({
    assignee: [],
    priority: [],
    status: [],
  });

  const { effectiveProjectId, setFilters: setTaskManagerFilters } = useTaskManager();

  useEffect(() => {
    setTaskManagerFilters({
      assignee: filters.assignee.map((a) => a.value),
      priority: filters.priority.map((p) => p.value),
      status: filters.status.map((s) => s.value),
    });
  }, [filters, setTaskManagerFilters]);

  const { data: statusesData } = useProjectStatuses(effectiveProjectId || undefined);
  const { data: prioritiesData, isLoading: prioritiesLoading } = usePriorities(effectiveProjectId);
  const { data: assigneesData, isLoading: assigneesLoading } = useAssignees(
    effectiveProjectId,
    assigneeSearchQuery,
  );
  const { data: currentUser } = useCurrentUser();

  const statusOptions = useMemo(
    () =>
      (statusesData ?? []).map((status) => ({
        value: status.id,
        label: status.name,
        displayLabel: <StatusBadge status={status} />,
      })),
    [statusesData],
  );

  const priorityOptions = useMemo(
    () =>
      prioritiesData?.map((priority) => ({
        value: priority.id,
        label: priority.name,
        displayLabel: <PriorityBadge priority={priority} />,
      })) || [],
    [prioritiesData],
  );
  const isPriorityDisabled = priorityOptions.length === 0;

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
                  user={{ id: "unassigned", displayName: "Unassigned" }}
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
              value: currentUser.id,
              label: currentUser.displayName,
              displayLabel: (
                <div className="flex items-center gap-2">
                  <UserAvatar user={currentUser} size="sm" extended />
                </div>
              ),
            },
          ]
        : []),
      ...(assigneesData?.map((assignee) => ({
        value: assignee.id,
        label: assignee.displayName,
        displayLabel: <UserAvatar user={assignee} size="sm" extended />,
      })) || []),
    ];
  }, [assigneesData, currentUser, assigneeSearchQuery]);

  const handleFilterChange = (
    key: "status" | "priority" | "assignee",
    values: MultiSelectOption[],
  ) => {
    setFilters({
      ...filters,
      [key]: values,
    });
  };

  return (
    <div className="mb-4 grid w-full grid-cols-2 gap-2">
      <MultiSelectFilter
        options={statusOptions}
        selected={filters.status}
        onChange={(values) => handleFilterChange("status", values)}
        label="Status"
        placeholder="All statuses"
      />
      <MultiSelectFilter
        options={priorityOptions}
        selected={filters.priority}
        onChange={(values) => handleFilterChange("priority", values)}
        label="Priority"
        placeholder={
          prioritiesLoading
            ? "All priorities"
            : isPriorityDisabled
              ? "No priorities available"
              : "All priorities"
        }
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
        />
      </div>
    </div>
  );
}
