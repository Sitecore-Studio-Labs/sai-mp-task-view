"use client";

import { mdiDotsVertical, mdiReply } from "@mdi/js";
import type { PlatformComment } from "@mp/task-core";
import { usePlatformCapabilities } from "@mp/task-core";

import { formatCommentDate } from "../../../helpers/formatCommentDate";
import { type ADFNode, AdfRenderer } from "../../common/AdfRenderer";
import { Button } from "../../ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../../ui/dropdown-menu";
import { Icon } from "../../ui/icon";
import { UserAvatar } from "./UserAvatar";

interface CommentCardProps {
  comment: PlatformComment;
  onReply: (comment: PlatformComment) => void;
}

export function CommentCard({ comment, onReply }: CommentCardProps) {
  const { hasCommentReplies } = usePlatformCapabilities();

  return (
    <div className="flex items-start gap-2">
      <UserAvatar user={comment.author} size="sm" />
      <div className="w-full">
        <div className="mb-1 flex items-center gap-2">
          <span className="font-medium" data-testid="author-comment">
            {comment.author.displayName}
          </span>
          <span className="text-muted-foreground mr-auto text-xs">
            {formatCommentDate(comment.created)}
          </span>
          {hasCommentReplies && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  colorScheme="neutral"
                  size="icon-xs"
                  aria-label="Comment options"
                >
                  <Icon path={mdiDotsVertical} size="sm" />
                  <span className="sr-only">Comment options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuItem onSelect={() => onReply(comment)}>
                    <Icon path={mdiReply} size="md" />
                    Reply
                  </DropdownMenuItem>
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        <AdfRenderer document={comment.body as ADFNode} />
      </div>
    </div>
  );
}
