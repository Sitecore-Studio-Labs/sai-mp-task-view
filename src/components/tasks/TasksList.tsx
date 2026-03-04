"use client";

import Image from "next/image";
import { Spinner } from "@/components/ui/spinner";
import { StatusBadge } from "./elements/StatusBadge";
import { UserAvatar } from "./elements/UserAvatar";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { JiraIssue } from "@/types/jira";

export function TasksList({
  tasks,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  onTaskClick,
  selectedTaskKey,
}: {
  tasks: JiraIssue[];
  hasNextPage?: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  onTaskClick?: (taskKey: string) => void;
  selectedTaskKey?: string | null;
}) {
  return (
    <ul>
      {tasks.map((task) => {
        const isSelected = selectedTaskKey != null && task.key === selectedTaskKey;
        return (
          <li key={task.key}>
            <Separator className="my-4" />
            <div
              className={
                [
                  "wrapper box-border rounded-lg py-3 transition-colors",
                  onTaskClick && "cursor-pointer hover:bg-muted/50",
                  isSelected &&
                    "bg-muted/50 shadow-sm ring-2 ring-primary/25 ring-inset",
                ]
                  .filter(Boolean)
                  .join(" ")
              }
              role={onTaskClick ? "button" : undefined}
              tabIndex={onTaskClick ? 0 : undefined}
              onClick={onTaskClick ? () => onTaskClick(task.key) : undefined}
              onKeyDown={
                onTaskClick
                  ? (e) => {
                      if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        onTaskClick(task.key);
                      }
                    }
                  : undefined
            }
          >
            <span className="font-medium text-sm text-muted-foreground mb-3 block">
              {task.key}
            </span>

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
              {task.fields.priority?.iconUrl && (
                <Image
                  src={task.fields.priority.iconUrl}
                  alt={task.fields.priority.name}
                  width={12}
                  height={12}
                />
              )}
              <span className="text-xs text-muted-foreground">
                {task.fields.priority?.name}
              </span>
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
