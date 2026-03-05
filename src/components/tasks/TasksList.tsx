"use client";

import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "./elements/StatusBadge";
import { UserAvatar } from "./elements/UserAvatar";
import { PriorityBadge } from "./elements/PriorityBadge";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { JiraIssue } from "@/types/jira";

export function TasksList({
  tasks,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  onSelectTask,
  onTaskClick,
  selectedTaskKey,
  recentlyUpdatedKeys,
}: {
  tasks: JiraIssue[];
  hasNextPage?: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  onSelectTask?: (taskKey: string) => void;
  onTaskClick?: (taskKey: string) => void;
  selectedTaskKey?: string | null;
  recentlyUpdatedKeys?: ReadonlySet<string>;
}) {
  const handleTaskClick = onTaskClick ?? onSelectTask;

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
              className={
                [
                  "wrapper box-border rounded-lg py-3 transition-colors",
                  handleTaskClick && "cursor-pointer hover:bg-muted/50",
                  isSelected &&
                    "bg-muted/50 shadow-sm ring-2 ring-primary/25 ring-inset",
                ]
                  .filter(Boolean)
                  .join(" ")
              }
              role={handleTaskClick ? "button" : undefined}
              tabIndex={handleTaskClick ? 0 : undefined}
              onClick={
                handleTaskClick ? () => handleTaskClick(task.key) : undefined
              }
              onKeyDown={
                handleTaskClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleTaskClick(task.key);
                      }
                    }
                  : undefined
            }
            >
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
              "Load more"
            )}
          </Button>
        </div>
      )}
    </ul>
  );
}
