"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";
import { useBoardIssues } from "@/hooks/useProjectIssues";
import { useJiraProjects } from "@/hooks/useJiraProjects";
import { useJiraConnectionStatus } from "@/hooks/useJiraConnectionStatus";
import type { JiraIssue } from "@/types/jira";
import type { AsyncStateStatus } from "@/types/async-state";
import { TasksList } from "@/components/tasks/TasksList";
import { TaskDetailsContainer } from "@/components/tasks/TaskDetailsContainer";
import TaskListFilters, {
  type TaskListFiltersType,
} from "@/components/tasks/TaskListFilters";
import {
  LoadingCard,
  ErrorCard,
  EmptyCard,
} from "@/components/common/AsyncStateCards";
import { Separator } from "@/components/ui/separator";

export function TaskListSection() {
  const [selectedTaskKey, setSelectedTaskKey] = useState<string | null>(null);
  const [filters, setFilters] = useState<TaskListFiltersType>({
    assignee: [],
    priority: [],
    status: [],
  });
  const queryClient = useQueryClient();
  const { effectiveProjectKey, effectiveProjectId } = useTaskManager();
  const { data: projects, isLoading, isError, refetch } = useJiraProjects();
  const { data: status } = useJiraConnectionStatus();
  const connected = status?.connected ?? false;
  const {
    data: issuesData,
    isLoading: issuesLoading,
    isError: issuesError,
    refetch: refetchIssues,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useBoardIssues(effectiveProjectKey, filters);

  const hasProjects = Array.isArray(projects) && projects.length > 0;
  const projectsStatus: AsyncStateStatus = isLoading
    ? "loading"
    : isError
      ? "error"
      : !hasProjects
        ? "empty"
        : "success";

  const tasks = (issuesData?.pages.flatMap((p) => p.issues ?? []) ??
    []) as JiraIssue[];

  return (
    <section className="mt-6">
      {projectsStatus === "loading" && (
        <LoadingCard message="Loading projects…" />
      )}
      {projectsStatus === "error" && (
        <ErrorCard
          message="Could not load projects. Check your connection and try again."
          onRetry={refetch}
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
              <TaskListFilters
                selectedProjectId={effectiveProjectKey ?? undefined}
                filters={filters}
                onChange={setFilters}
              />
              <Separator className="my-4" />
              {issuesLoading ? (
                <LoadingCard message="Loading tasks…" />
              ) : issuesError ? (
                <ErrorCard
                  message="Could not load tasks. Check your connection and try again."
                  onRetry={refetchIssues}
                />
              ) : tasks.length === 0 ? (
                <EmptyCard message="No tasks in this project yet" />
              ) : (
                <>
                  <TasksList
                    tasks={tasks}
                    hasNextPage={hasNextPage}
                    fetchNextPage={fetchNextPage}
                    isFetchingNextPage={isFetchingNextPage}
                    onTaskClick={setSelectedTaskKey}
                    selectedTaskKey={selectedTaskKey}
                  />
                  <TaskDetailsContainer
                    initialTaskKey={selectedTaskKey}
                    onOpenChange={(open) => !open && setSelectedTaskKey(null)}
                    onTaskDelete={() => {
                      setSelectedTaskKey(null);
                      queryClient.invalidateQueries({
                        queryKey: ["jira", "boardIssues", effectiveProjectKey],
                      });
                    }}
                  />
                </>
              )}
            </>
          )}
        </>
      )}
    </section>
  );
}
