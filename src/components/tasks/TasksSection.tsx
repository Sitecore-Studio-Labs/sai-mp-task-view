'use client';

import { TasksList } from './TasksList';
import { DataState, DataStateStatus } from '../common/DataState';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { mdiPlus } from '@mdi/js';
import { JiraIssue } from '@/types/jira';

export default function TasksSection({
  tasks,
  hasNextPage,
  onLoadMore,
  isLoadingMore,
  status,
  onRetry,
}: {
  tasks: JiraIssue[];
  hasNextPage?: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  status: DataStateStatus;
  onRetry: () => void;
}) {
  return (
    <>
      <section className="wrapper">
        <div className="flex justify-between gap-4 items-center">
          <h2 className="font-bold">Tasks</h2>
          <Button variant="ghost" size="sm">
            <Icon path={mdiPlus} colorScheme="neutral" />
            New
          </Button>
        </div>
      </section>

      <div className="wrapper my-4">
        <DataState
          status={status}
          onRetry={onRetry}
          loadingText="Loading tasks..."
          errorText="Could not load tasks. Check your connection and try again."
          emptyText="No tasks to display."
        />
      </div>
      {status === 'success' && (
        <TasksList
          tasks={tasks}
          hasNextPage={hasNextPage}
          fetchNextPage={onLoadMore}
          isFetchingNextPage={isLoadingMore}
        />
      )}
    </>
  );
}
