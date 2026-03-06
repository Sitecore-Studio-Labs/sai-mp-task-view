"use client";

import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "./elements/StatusBadge";
import { UserAvatar } from "./elements/UserAvatar";
import { PriorityBadge } from "./elements/PriorityBadge";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";
import { Badge } from "../ui/badge";

export function TasksList({
  recentlyUpdatedKeys,
}: {
  recentlyUpdatedKeys?: ReadonlySet<string>;
}) {
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
        const isSelected =
          selectedTaskKey != null && task.key === selectedTaskKey;
        const isRecentlyUpdated =
          recentlyUpdatedKeys != null && recentlyUpdatedKeys.has(task.key);
        return (
          <li key={task.key}>
            <Separator className="my-4" />
            <div
              className={[
                "wrapper box-border rounded-lg py-3 transition-colors",
                "cursor-pointer hover:bg-muted/50",
                isSelected &&
                  "bg-muted/50 shadow-sm ring-2 ring-primary/25 ring-inset",
              ]
                .filter(Boolean)
                .join(" ")}
              role="button"
              tabIndex={0}
              onClick={() => setSelectedTaskKey(task.key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setSelectedTaskKey(task.key);
                }
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <span className="font-medium text-sm text-muted-foreground">
                  {task.key}
                </span>
                {!isRecentlyUpdated && (
                  <Badge
                    colorScheme="success"
                    size="sm"
                    className="text-xs"
                    title="Recently updated"
                  >
                    <span
                      className="size-1.5 rounded-full bg-success-fg shrink-0"
                      aria-hidden
                    />
                    Updated
                  </Badge>
                )}
              </div>

              <div className="flex gap-2 items-start mb-4">
                <h3 className="mr-auto mt-1.5 text-sm font-medium">
                  {task.fields.summary}
                </h3>
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

      {hasNextTasksPage && (
        <div className="wrapper my-4">
          <Button
            onClick={fetchNextTasksPage}
            disabled={isFetchingTasksNextPage}
            variant="outline"
            className="w-full"
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
