'use client';

import { useEffect, useState } from 'react';
import { useJiraProjects } from '@/hooks/useJiraProjects';
import { useJiraConnectionStatus } from '@/hooks/useJiraConnectionStatus';
import { useBoardIssues } from '@/hooks/useProjectIssues';
import TasksSection from '../tasks/TasksSection';
import { DataStateStatus } from '../common/DataState';
import { Separator } from '@/components/ui/separator';
import ProjectsSection from '../projects/ProjectsSection';
import TaskListFilters from '../tasks/TaskListFilters';

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

  // Filters
  const [filters, setFilters] = useState({
    assignee: [] as string[],
    priority: [] as string[],
    status: [] as string[],
  });

  useEffect(() => {
    const resetFilters = () => {
      setFilters({
        assignee: [],
        priority: [],
        status: [],
      });
    };
    resetFilters();
  }, [selectedProjectId]);

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
        <>
          <TaskListFilters
            selectedProjectId={selectedProjectId}
            filters={filters}
            onChange={setFilters}
          />
          <Separator className="my-4" />
          <TasksSection
            tasks={tasks}
            hasNextPage={hasNextPage}
            onLoadMore={fetchNextPage}
            isLoadingMore={isFetchingNextPage}
            status={tasksUiStatus}
            refetchTasks={refetchTasks}
          />
        </>
      )}
    </>
  );
}
