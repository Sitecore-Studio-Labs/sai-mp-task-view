"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { STATUS_COLOR_SCHEME_MAP } from "@/constants/statuses";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { mdiAccountOutline } from "@mdi/js";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { JiraIssue } from "@/types/jira";

export function TasksList({
  tasks,
  hasNextPage,
  fetchNextPage,
  isFetchingNextPage,
}: {
  tasks: JiraIssue[];
  hasNextPage?: boolean;
  fetchNextPage: () => void;
  isFetchingNextPage: boolean;
}) {
  return (
    <ul>
      {tasks.map((issue) => (
        <li key={issue.key}>
          <Separator className="my-4" />
          <div className="wrapper">
            <span className="font-medium text-sm text-muted-foreground mb-3 block">
              {issue.key}
            </span>

            <div className="flex gap-2 items-start mb-4">
              <h3 className="mr-auto mt-1.5 text-sm font-medium">
                {issue.fields.summary}
              </h3>
              <div className="flex items-center gap-2">
                <Badge
                  colorScheme={
                    STATUS_COLOR_SCHEME_MAP[
                      issue.fields.status.statusCategory.key
                    ] || "neutral"
                  }
                  className="text-xs"
                >
                  {issue.fields.status.name}
                </Badge>

                <Avatar>
                  <AvatarImage
                    src={issue.fields.assignee?.avatarUrls?.["48x48"]}
                    alt={
                      issue.fields.assignee?.displayName || "Assignee Avatar"
                    }
                    title={
                      issue.fields.assignee?.displayName || "Assignee Avatar"
                    }
                  />
                  <AvatarFallback>
                    <Icon
                      path={mdiAccountOutline}
                      className="size-5 text-gray-700"
                      title="Unassigned"
                    />
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>

            <div className="flex gap-1 items-center">
              {issue.fields.priority?.iconUrl && (
                <Image
                  src={issue.fields.priority.iconUrl}
                  alt={issue.fields.priority.name}
                  width={12}
                  height={12}
                />
              )}
              <span className="text-xs text-muted-foreground">
                {issue.fields.priority?.name}
              </span>
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
