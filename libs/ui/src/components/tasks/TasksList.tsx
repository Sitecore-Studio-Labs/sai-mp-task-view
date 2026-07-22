"use client";

import { usePerformanceTracker } from "@mp/observability";
import {
  getTaskDisplayIdentifier,
  shouldShowKeyIdentifier,
  usePlatformCapabilities,
  useTaskManager,
} from "@mp/task-core";

import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { Spinner } from "../ui/spinner";
import { PriorityBadge } from "./elements/PriorityBadge";
import { StatusBadge } from "./elements/StatusBadge";
import { UserAvatar } from "./elements/UserAvatar";

export function TasksList({ recentlyUpdatedKeys }: { recentlyUpdatedKeys?: ReadonlySet<string> }) {
  usePerformanceTracker("task-manager.task-list");
  const { taskKeyDisplay = "key" } = usePlatformCapabilities();
  const showKeyIdentifier = shouldShowKeyIdentifier(taskKeyDisplay);
  const {
    selectedTaskKey,
    setSelectedTaskKey,
    tasks,
    hasNextTasksPage,
    fetchNextTasksPage,
    isFetchingTasksNextPage,
  } = useTaskManager();

  return (
    <ul>
      {tasks.map((task) => {
        const isSelected = selectedTaskKey != null && task.key === selectedTaskKey;
        const isRecentlyUpdated = recentlyUpdatedKeys != null && recentlyUpdatedKeys.has(task.key);
        const displayIdentifier = getTaskDisplayIdentifier(task, taskKeyDisplay);
        return (
          <li key={task.key}>
            <Separator className="my-2" />
            <div
              className={[
                "wrapper box-border rounded-lg py-3 transition-colors",
                "hover:bg-muted/50 cursor-pointer",
                isSelected && "bg-muted/50 ring-primary/25 shadow-sm ring-2 ring-inset",
              ]
                .filter(Boolean)
                .join(" ")}
              role="button"
              tabIndex={0}
              data-testid={`task-list-row-${task.key}`}
              onClick={() => setSelectedTaskKey(task.key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedTaskKey(task.key);
                }
              }}
            >
              <>
                <div className="flex items-center gap-2">
                  {showKeyIdentifier && (
                    <span className="text-muted-foreground mb-3 text-sm font-medium">
                      {displayIdentifier}
                    </span>
                  )}
                  {isRecentlyUpdated && (
                    <Badge
                      colorScheme="success"
                      size="sm"
                      className="mb-3 text-xs"
                      title="Recently updated"
                    >
                      <span className="bg-success-fg size-1.5 shrink-0 rounded-full" aria-hidden />
                      Updated
                    </Badge>
                  )}
                </div>
                <div className="mb-4 flex items-start gap-2">
                  <h3 className="mt-1.5 mr-auto line-clamp-2 min-w-0 flex-1 text-sm font-medium break-words">
                    {task.fields.summary}
                  </h3>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={task.fields.status} />
                    <UserAvatar user={task.fields.assignee} />
                  </div>
                </div>
              </>
              <div className="flex items-center gap-1">
                <PriorityBadge priority={task.fields.priority} iconOnly />
              </div>
            </div>
          </li>
        );
      })}

      {hasNextTasksPage && (
        <div className="wrapper my-4">
          <Button
            onClick={fetchNextTasksPage}
            disabled={isFetchingTasksNextPage}
            variant="outline"
            className="w-full"
            data-testid="task-list-load-more"
          >
            {isFetchingTasksNextPage ? (
              <span className="flex items-center gap-2">
                <Spinner />
              </span>
            ) : (
              "Load more"
            )}
          </Button>
        </div>
      )}
    </ul>
  );
}
