"use client";

import { useEffect, useMemo, useState } from "react";

import { extractUniqueStatuses } from "@/helpers/extractUniqueStatuses";
import { useJiraAssignees } from "@/hooks/useJiraAssignees";
import { useJiraCurrentUser } from "@/hooks/useJiraCurrentUser";
import { useJiraPriorities } from "@/hooks/useJiraPriorities";
import { useProjectIssueStatuses } from "@/hooks/useProjectIssueStatuses";
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

  const { effectiveProjectKey, setFilters: setTaskManagerFilters } = useTaskManager();

  // Sync local filters to TaskManager context
  useEffect(() => {
    setTaskManagerFilters({
      assignee: filters.assignee.map((a) => a.value),
      priority: filters.priority.map((p) => p.value),
      status: filters.status.map((s) => s.value),
    });
  }, [filters, setTaskManagerFilters]);

  const { data: statusesData } = useProjectIssueStatuses(effectiveProjectKey || undefined);
  const { data: prioritiesData, isLoading: prioritiesLoading } =
    useJiraPriorities(effectiveProjectKey);
  const { data: assigneesData, isLoading: assigneesLoading } = useJiraAssignees(
    effectiveProjectKey,
    assigneeSearchQuery,
  );
  const { data: currentUser } = useJiraCurrentUser();

  const statuses = useMemo(() => extractUniqueStatuses(statusesData), [statusesData]);

  const statusOptions = useMemo(
    () =>
      statuses.map((status) => ({
        value: status.id,
        label: status.name,
        displayLabel: <StatusBadge status={status} />,
      })),
    [statuses],
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
              value: currentUser.accountId,
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
        value: assignee.accountId,
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
