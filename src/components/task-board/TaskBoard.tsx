'use client';

import { useEffect, useState } from 'react';
import { useJiraProjects } from '@/hooks/useJiraProjects';
import { useJiraConnectionStatus } from '@/hooks/useJiraConnectionStatus';
import { useBoardIssues } from '@/hooks/useProjectIssues';
import TasksSection from '../tasks/TasksSection';
import { DataStateStatus } from '../common/DataState';
import { Separator } from '@/components/ui/separator';
import ProjectsSection from '../projects/ProjectsSection';

export default function TaskBoard() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(
    null,
  );

  // Connection status
  const { data: status } = useJiraConnectionStatus();
  const connected = status?.connected ?? false;

  useEffect(() => {
    const resetBoard = () => {
      setSelectedProjectId(null);
    };
    if (!connected) {
      resetBoard();
    }
  }, [connected]);

  // Projects
  const {
    data: projects,
    isLoading: projectsLoading,
    isError: projectsError,
    refetch: refetchProjects,
  } = useJiraProjects();

  const hasProjects = Array.isArray(projects) && projects.length > 0;

  const projectsUiStatus: DataStateStatus = projectsLoading
    ? 'loading'
    : projectsError
      ? 'error'
      : !hasProjects
        ? 'empty'
        : 'success';

  const [filters, setFilters] = useState({
    assignee: [] as string[],
    priority: [] as string[],
    status: [] as string[],
  });

  /**
   * Toggles a filter value for a given key.
   * Adds the value if not present, removes it if already applied.
   */
  const toggleFilter = (
    key: 'status' | 'priority' | 'assignee',
    value: string,
  ) => {
    setFilters((prev) => {
      const exists = prev[key].includes(value);

      return {
        ...prev,
        [key]: exists
          ? prev[key].filter((v) => v !== value)
          : [...prev[key], value],
      };
    });
  };

  // Tasks
  const {
    data: tasksData,
    fetchNextPage,
    hasNextPage,
    isLoading: tasksLoading,
    isFetchingNextPage,
    isError: tasksError,
    refetch: refetchTasks,
  } = useBoardIssues(selectedProjectId, filters);

  const tasks = tasksData?.pages.flatMap((page) => page.issues) ?? [];
  const hasTasks = tasks.length > 0;

  const tasksUiStatus: DataStateStatus = tasksLoading
    ? 'loading'
    : tasksError
      ? 'error'
      : !hasTasks
        ? 'empty'
        : 'success';

  return (
    <>
      <ProjectsSection
        projects={projects!}
        selectedProjectId={selectedProjectId}
        onSelectProject={setSelectedProjectId}
        uiStatus={projectsUiStatus}
        refetchProjects={refetchProjects}
        connected={connected}
      />
      <Separator className="my-4" />
      {selectedProjectId && (
        <TasksSection
          tasks={tasks}
          hasNextPage={hasNextPage}
          onLoadMore={fetchNextPage}
          isLoadingMore={isFetchingNextPage}
          status={tasksUiStatus}
          refetchTasks={refetchTasks}
        />
      )}
    </>
  );
}
