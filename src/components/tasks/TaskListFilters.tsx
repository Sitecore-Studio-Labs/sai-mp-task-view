'use client';

import { useMemo } from 'react';
import { useProjectIssueStatuses } from '@/hooks/useProjectIssueStatuses';
import {
  MultiSelectFilter,
  MultiSelectOption,
} from './elements/MultiSelectFilter';
import { extractUniqueStatuses } from '@/helpers/extractUniqueStatuses';

export type TaskListFiltersType = {
  assignee: string[];
  priority: string[];
  status: string[];
};

export default function TaskListFilters({
  selectedProjectId,
  filters,
  onChange,
}: {
  selectedProjectId?: string;
  filters: TaskListFiltersType;
  onChange: (filters: TaskListFiltersType) => void;
}) {
  const { data: statusesData } = useProjectIssueStatuses(selectedProjectId);

  const statuses = useMemo(
    () => extractUniqueStatuses(statusesData),
    [statusesData],
  );

  const statusOptions: MultiSelectOption[] = useMemo(
    () =>
      statuses.map((status) => ({
        value: status.id,
        label: status.name,
      })),
    [statuses],
  );

  const assigneeOptions: MultiSelectOption[] = useMemo(
    () =>
      [{ id: '', name: 'Coming soon' }].map((assignee) => ({
        value: assignee.id,
        label: assignee.name,
      })),
    [],
  );

  const priorityOptions: MultiSelectOption[] = useMemo(
    () =>
      [{ id: '', name: 'Coming soon' }].map((priority) => ({
        value: priority.id,
        label: priority.name,
      })),
    [],
  );

  const handleFilterChange = (
    key: 'status' | 'priority' | 'assignee',
    values: string[],
  ) => {
    onChange({
      ...filters,
      [key]: values,
    });
  };

  return (
    <div className="wrapper grid grid-cols-2 gap-2">
      <MultiSelectFilter
        options={statusOptions}
        selected={filters.status}
        onChange={(values) => handleFilterChange('status', values)}
        label="Status"
        placeholder="All statuses"
      />
      <MultiSelectFilter
        options={priorityOptions}
        selected={filters.priority}
        onChange={(values) => handleFilterChange('priority', values)}
        label="Priority"
        placeholder="All priorities"
      />
      <div className="col-span-2">
        <MultiSelectFilter
          options={assigneeOptions}
          selected={filters.assignee}
          onChange={(values) => handleFilterChange('assignee', values)}
          label="Assignee"
          placeholder="All assignees"
        />
      </div>
    </div>
  );
}
