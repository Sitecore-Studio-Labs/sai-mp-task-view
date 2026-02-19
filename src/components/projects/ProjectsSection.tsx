'use client';

import { useJiraProjects } from '@/hooks/useJiraProjects';
import { useBoardIssues } from '@/hooks/useProjectIssues';
import { Card, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { mdiAlertOutline, mdiRefresh } from '@mdi/js';
import { useJiraConnectionStatus } from '@/hooks/useJiraConnectionStatus';

type ProjectsStatus = 'loading' | 'error' | 'empty' | 'success';

type ProjectsSectionProps = {
  selectedProjectId: string | null;
  selectedProjectKey: string | null;
};

export default function ProjectsSection({
  selectedProjectId,
  selectedProjectKey,
}: ProjectsSectionProps) {
  const { data: projects, isLoading, isError, refetch } = useJiraProjects();
  const { data: status } = useJiraConnectionStatus();
  const connected = status?.connected ?? false;
  const {
    data: issuesData,
    isLoading: issuesLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useBoardIssues(selectedProjectKey);

  const hasProjects = Array.isArray(projects) && projects.length > 0;

  const uiStatus: ProjectsStatus = isLoading
    ? 'loading'
    : isError
      ? 'error'
      : !hasProjects
        ? 'empty'
        : 'success';

  const issues = issuesData?.pages.flatMap((p) => p.issues ?? []) ?? [];

  return (
    <section className="mt-6">
      {uiStatus === 'loading' && <LoadingState />}

      {uiStatus === 'error' && <ErrorState onRetry={refetch} />}

      {uiStatus === 'empty' && <EmptyState connected={connected} />}

      {uiStatus === 'success' && (
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
          ) : issues.length === 0 ? (
            <Card elevation="none" style="outline">
              <CardTitle className="text-sm text-muted-foreground py-4 text-center">
                No tasks in this project yet
              </CardTitle>
            </Card>
          ) : (
            <ul className="space-y-2">
              {issues.map((issue: { id: string; key: string; fields?: { summary?: string } }) => (
                <li
                  key={issue.id}
                  className="rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span className="font-medium text-foreground">{issue.key}</span>
                  {issue.fields?.summary != null && (
                    <span className="ml-2 text-muted-foreground">
                      {issue.fields.summary}
                    </span>
                  )}
                </li>
              ))}
              {hasNextPage && (
                <li className="flex justify-center pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => fetchNextPage()}
                    disabled={isFetchingNextPage}
                  >
                    {isFetchingNextPage ? 'Loading…' : 'Load more'}
                  </Button>
                </li>
              )}
            </ul>
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
            ? 'No projects in your account, or your account has no access yet.'
            : 'Connect to a platform from the list above to see your projects here.'}
        </CardTitle>
      </div>
    </Card>
  );
}
