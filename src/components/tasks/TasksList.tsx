'use client';

import { Spinner } from '@/components/ui/spinner';
import { Button } from '../ui/button';
import { Separator } from '../ui/separator';
import { JiraIssue } from '@/types/jira';
import { StatusBadge } from './elements/StatusBadge';
import { UserAvatar } from './elements/UserAvatar';
import { PriorityBadge } from './elements/PriorityBadge';

export function TasksList({
  tasks,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  onSelectTask,
  recentlyUpdatedKeys,
}: {
  tasks: JiraIssue[];
  hasNextPage?: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  onSelectTask: (taskKey: string) => void;
  recentlyUpdatedKeys?: ReadonlySet<string>;
}) {
  return (
    <ul>
      {tasks.map((task) => {
        const isRecentlyUpdated =
          recentlyUpdatedKeys != null && recentlyUpdatedKeys.has(task.key);
        return (
          <li key={task.key}>
            <Separator className="my-4" />
            <div className="wrapper">
              <div className="flex items-center gap-2 mb-3">
                <span className="font-medium text-sm text-muted-foreground">
                  {task.key}
                </span>
                {isRecentlyUpdated && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full bg-success-bg text-success-fg px-2 py-0.5 text-xs font-medium"
                    title="Recently updated"
                  >
                    <span
                      className="size-1.5 rounded-full bg-success-fg shrink-0"
                      aria-hidden
                    />
                    Updated
                  </span>
                )}
              </div>

              <div className="flex gap-2 items-start mb-4">
                <button
                  onClick={() => onSelectTask(task.key)}
                  className="mr-auto mt-1.5 text-sm font-medium text-left hover:underline cursor-pointer"
                >
                  {task.fields.summary}
                </button>
                <div className="flex items-center gap-2">
                  <StatusBadge status={task.fields.status} />
                  <UserAvatar user={task.fields.assignee} />
                </div>
              </div>

              <div className="flex gap-1 items-center">
                <PriorityBadge priority={task.fields.priority} />
              </div>
            </div>
          </li>
        );
      })}

      {hasNextPage && (
        <div className="wrapper my-4">
          <Button
            onClick={fetchNextPage}
            disabled={isFetchingNextPage}
            variant="outline"
            className="w-full"
          >
            {isFetchingNextPage ? (
              <span className="flex items-center gap-2">
                <Spinner />
              </span>
            ) : (
              'Load more'
            )}
          </Button>
        </div>
      )}
    </ul>
  );
}
