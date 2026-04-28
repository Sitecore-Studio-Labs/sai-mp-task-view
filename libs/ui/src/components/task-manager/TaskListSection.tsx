"use client";

import type { AsyncStateStatus } from "@mp/task-core";
import { useTaskManager } from "@mp/task-core";

import { EmptyCard, ErrorCard, LoadingCard } from "../common/AsyncStateCards";
import { TaskListFilters } from "../tasks/TaskListFilters";
import { TasksList } from "../tasks/TasksList";

interface TaskListSectionProps {
  /** Slot for the task detail overlay (e.g. TaskDetailsContainer). */
  taskDetailsSlot?: React.ReactNode;
}

export function TaskListSection({ taskDetailsSlot }: TaskListSectionProps) {
  const {
    connected,
    projects,
    projectsLoading,
    projectsError,
    refetchProjects,
    projectsRefetching,
    effectiveProjectId,
    tasks,
    tasksLoading,
    tasksError,
    refetchTasks,
  } = useTaskManager();

  const hasProjects = Array.isArray(projects) && projects.length > 0;
  const projectsStatus: AsyncStateStatus =
    projectsLoading || projectsRefetching
      ? "loading"
      : projectsError
        ? "error"
        : !hasProjects
          ? "empty"
          : "success";

  return (
    <section className="mt-6">
      {projectsStatus === "loading" && <LoadingCard message="Loading projects…" />}
      {projectsStatus === "error" && (
        <ErrorCard
          message="Could not load projects. Check your connection and try again."
          onRetry={refetchProjects}
        />
      )}
      {projectsStatus === "empty" && (
        <EmptyCard
          message={
            connected
              ? "No projects in your account, or your account has no access yet."
              : "Connect to a platform from the list above to see your projects here."
          }
        />
      )}

      {projectsStatus === "success" && (
        <>
          {!effectiveProjectId ? (
            <EmptyCard message="Select a project above to view tasks" />
          ) : (
            <>
              <TaskListFilters />
              {tasksLoading ? (
                <LoadingCard message="Loading tasks…" />
              ) : tasksError ? (
                <ErrorCard
                  message="Could not load tasks. Check your connection and try again."
                  onRetry={refetchTasks}
                />
              ) : tasks.length === 0 ? (
                <EmptyCard message="No tasks in this project yet" />
              ) : (
                <>
                  <TasksList />
                  {taskDetailsSlot}
                </>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
