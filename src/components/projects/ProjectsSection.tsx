'use client';

import ProjectsList from './ProjectsList';
import { DataState, DataStateStatus } from '../common/DataState';
import { JiraProject } from '@/types/jira';

export default function ProjectsSection({
  projects,
  selectedProjectId,
  onSelectProject,
  uiStatus,
  refetchProjects,
  connected,
}: {
  projects: JiraProject[];
  selectedProjectId: string | null;
  onSelectProject: (id: string | null) => void;
  uiStatus: DataStateStatus;
  refetchProjects?: () => void;
  connected: boolean;
}) {
  return (
    <>
      <section className="wrapper">
        <DataState
          status={uiStatus}
          onRetry={refetchProjects}
          loadingText="Loading projects..."
          errorText="Could not load projects. Check your connection and try again."
          emptyText={
            connected
              ? 'No projects in your account, or your account has no access yet.'
              : 'Connect to a platform from the list above to see your projects here.'
          }
        />
      </section>
      {uiStatus === 'success' && (
        <ProjectsList
          projects={projects!}
          selectedProjectId={selectedProjectId}
          onSelectProject={onSelectProject}
        />
      )}
    </>
  );
}
