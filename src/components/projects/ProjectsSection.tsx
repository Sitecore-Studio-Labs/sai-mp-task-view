'use client';

import { useJiraProjects } from '@/hooks/useJiraProjects';
import { Card, CardTitle } from '@/components/ui/card';
import { Spinner } from '@/components/ui/spinner';
import { Button } from '@/components/ui/button';
import { Icon } from '@/components/ui/icon';
import { mdiAlertOutline, mdiRefresh } from '@mdi/js';
import { useJiraConnectionStatus } from '@/hooks/useJiraConnectionStatus';
import ProjectsList from './ProjectsList';

type ProjectsStatus = 'loading' | 'error' | 'empty' | 'success';

export default function ProjectsSection() {
  const { data: projects, isLoading, isError, refetch } = useJiraProjects();
  const { data: status } = useJiraConnectionStatus();
  const connected = status?.connected ?? false;

  const hasProjects = Array.isArray(projects) && projects.length > 0;

  const uiStatus: ProjectsStatus = isLoading
    ? 'loading'
    : isError
      ? 'error'
      : !hasProjects
        ? 'empty'
        : 'success';

  return (
    <section className="mt-6">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-700">
        Projects
      </h2>

      {uiStatus === 'loading' && <LoadingState />}

      {uiStatus === 'error' && <ErrorState onRetry={refetch} />}

      {uiStatus === 'empty' && <EmptyState connected={connected} />}

      {uiStatus === 'success' && <ProjectsList projects={projects!} />}
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
