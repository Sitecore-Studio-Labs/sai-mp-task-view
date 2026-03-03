'use client';

import { useState } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { TasksList } from './TasksList';
import { TaskDetailsContainer } from './TaskDetailsContainer';
import { DataState, DataStateStatus } from '../common/DataState';
import { Button } from '../ui/button';
import { Icon } from '../ui/icon';
import { Spinner } from '@/components/ui/spinner';
import { mdiPlus, mdiRefresh } from '@mdi/js';
import { JiraIssue } from '@/types/jira';

export default function TasksSection({
  tasks,
  hasNextPage,
  onLoadMore,
  isLoadingMore,
  status,
  refetchTasks,
  isSyncing,
  lastSyncedAt,
  recentlyUpdatedKeys,
}: {
  tasks: JiraIssue[];
  hasNextPage?: boolean;
  onLoadMore: () => void;
  isLoadingMore: boolean;
  status: DataStateStatus;
  refetchTasks: () => void;
  isSyncing?: boolean;
  lastSyncedAt?: number;
  recentlyUpdatedKeys?: ReadonlySet<string>;
}) {
  const [selectedTaskKey, setSelectedTaskKey] = useState<string | null>(null);

  const handleTaskDelete = () => {
    setSelectedTaskKey(null);
    refetchTasks();
  };

  const lastSyncedLabel =
    lastSyncedAt != null
      ? `Last synced ${formatDistanceToNow(lastSyncedAt, { addSuffix: true })}`
      : null;

  return (
    <>
      <section className="wrapper">
        <div className="flex flex-wrap justify-between gap-4 items-center">
          <h2 className="font-bold">Tasks</h2>
          <div className="flex items-center gap-3">
            {lastSyncedLabel && (
              <span className="text-muted-foreground text-sm">
                {lastSyncedLabel}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchTasks()}
              disabled={isSyncing}
              aria-label="Sync tasks"
            >
              {isSyncing ? (
                <Spinner className="size-4" />
              ) : (
                <Icon path={mdiRefresh} size="sm" colorScheme="neutral" />
              )}
            </Button>
            <Button variant="ghost" size="sm">
              <Icon path={mdiPlus} colorScheme="neutral" />
              New
            </Button>
          </div>
        </div>
      </section>

      <div className="wrapper my-4">
        <DataState
          status={status}
          onRetry={refetchTasks}
          loadingText="Loading tasks..."
          errorText="Could not load tasks. Check your connection and try again."
          emptyText="No tasks to display."
        />
      </div>
      {status === 'success' && (
        <>
          <TasksList
            tasks={tasks}
            hasNextPage={hasNextPage}
            fetchNextPage={onLoadMore}
            isFetchingNextPage={isLoadingMore}
            onSelectTask={setSelectedTaskKey}
            recentlyUpdatedKeys={recentlyUpdatedKeys}
          />

          <TaskDetailsContainer
            initialTaskKey={selectedTaskKey}
            onOpenChange={(open) => {
              if (!open) {
                setSelectedTaskKey(null);
              }
            }}
            onTaskDelete={handleTaskDelete}
          />
        </>
      )}
    </>
  );
}
