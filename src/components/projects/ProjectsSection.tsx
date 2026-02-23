"use client";

import { useJiraProjects } from "@/hooks/useJiraProjects";
import { useBoardIssues } from "@/hooks/useProjectIssues";
import { Card, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { mdiAlertOutline, mdiRefresh } from "@mdi/js";
import { useJiraConnectionStatus } from "@/hooks/useJiraConnectionStatus";
import type { JiraIssue } from "@/types/jira";
import { TasksList, type ViewMode } from "@/components/tasks/TasksList";

type ProjectsStatus = "loading" | "error" | "empty" | "success";

type ProjectsSectionProps = {
  selectedProjectId: string | null;
  selectedProjectKey: string | null;
  taskListViewMode?: ViewMode;
};

export default function ProjectsSection({
  selectedProjectId,
  selectedProjectKey,
  taskListViewMode = "list",
}: ProjectsSectionProps) {
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
  } = useBoardIssues(selectedProjectKey, {
    assignee: [],
    priority: [],
    status: [],
  });

  const hasProjects = Array.isArray(projects) && projects.length > 0;

  const uiStatus: ProjectsStatus = isLoading
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
      {uiStatus === "loading" && <LoadingState />}

      {uiStatus === "error" && <ErrorState onRetry={refetch} />}

      {uiStatus === "empty" && <EmptyState connected={connected} />}

      {uiStatus === "success" && (
        <>
          {!selectedProjectId ? (
            <Card elevation="none" style="outline">
              <CardTitle className="text-sm text-muted-foreground py-4 text-center">
                Select a project above to view tasks
              </CardTitle>
            </Card>
          ) : issuesLoading ? (
            <Card elevation="none" style="outline">
              <CardTitle className="flex justify-center items-center gap-3 text-gray-700 py-4">
                <Spinner />
                <span className="text-sm">Loading tasks…</span>
              </CardTitle>
            </Card>
          ) : issuesError ? (
            <Card elevation="none" style="outline">
              <CardTitle className="flex flex-col items-center gap-3">
                <Icon path={mdiAlertOutline} variant="subtle" colorScheme="danger" />
                <p className="text-sm text-center text-gray-700">
                  Could not load tasks. Check your connection and try again.
                </p>
                <Button variant="outline" size="sm" onClick={() => refetchIssues()}>
                  <Icon path={mdiRefresh} colorScheme="neutral" className="mr-2" />
                  Retry
                </Button>
              </CardTitle>
            </Card>
          ) : tasks.length === 0 ? (
            <Card elevation="none" style="outline">
              <CardTitle className="text-sm text-muted-foreground py-4 text-center">
                No tasks in this project yet
              </CardTitle>
            </Card>
          ) : (
            <TasksList
              tasks={tasks}
              hasNextPage={hasNextPage}
              fetchNextPage={fetchNextPage}
              isFetchingNextPage={isFetchingNextPage}
              viewMode={taskListViewMode}
            />
          )}
        </>
      )}
    </section>
  );
}

function LoadingState() {
  return (
    <Card elevation="none" style="outline">
      <CardTitle className="flex justify-center items-center gap-3 text-gray-700">
        <Spinner />
        <span className="text-sm">Loading projects…</span>
      </CardTitle>
    </Card>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card elevation="none" style="outline">
      <CardTitle className="flex flex-col items-center gap-3">
        <Icon path={mdiAlertOutline} variant="subtle" colorScheme="danger" />
        <p className="text-sm text-center text-gray-700">
          Could not load projects. <br />
          Check your connection and try again.
        </p>
      </CardTitle>
      <Button variant="outline" size="sm" onClick={onRetry}>
        <Icon path={mdiRefresh} colorScheme="neutral" className="mr-2" />
        Retry
      </Button>
    </Card>
  );
}

function EmptyState({ connected }: { connected: boolean }) {
  return (
    <Card elevation="none" style="outline">
      <div className="text-center">
        <CardTitle className="text-sm text-gray-700">
          {connected
            ? "No projects in your account, or your account has no access yet."
            : "Connect to a platform from the list above to see your projects here."}
        </CardTitle>
      </div>
    </Card>
  );
}
