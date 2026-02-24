"use client";

import { Spinner } from "@/components/ui/spinner";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { JiraIssue } from "@/types/jira";
import { StatusBadge } from "./elements/StatusBadge";
import { UserAvatar } from "./elements/UserAvatar";
import { PriorityBadge } from "./elements/PriorityBadge";

export function TasksList({
  tasks,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
  onSelectTask,
}: {
  tasks: JiraIssue[];
  hasNextPage?: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
  onSelectTask: (taskKey: string) => void;
}) {
  return (
    <ul>
      {tasks.map((task) => (
        <li key={task.key}>
          <Separator className="my-4" />
          <div className="wrapper">
            <span className="font-medium text-sm text-muted-foreground mb-3 block">
              {task.key}
            </span>

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
      ))}

      {hasNextPage && (
        <Button
          onClick={fetchNextPage}
          disabled={isFetchingNextPage}
          variant="outline"
          className="w-full mt-4"
        >
          {isFetchingNextPage ? (
            <span className="flex items-center gap-2">
              <Spinner />
            </span>
          ) : (
            "Load more"
          )}
        </Button>
      )}
    </ul>
  );
}
