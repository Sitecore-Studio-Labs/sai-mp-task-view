import { mdiDotsVertical, mdiReply } from "@mdi/js";
import {
  AdfRenderer,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@mp/ui";

import { formatCommentDate } from "../../../helpers/formatCommentDate";
import { Icon } from "../../../lib/icon";
import { JiraComment } from "../../../types/jira";
import { UserAvatar } from "./UserAvatar";

interface CommentCardProps {
  comment: JiraComment;
  onReply: (comment: JiraComment) => void;
}

export function CommentCard({ comment, onReply }: CommentCardProps) {
  return (
    <div key={comment.id} className="flex items-start gap-2">
      <UserAvatar user={comment.author} size="sm" />
      <div className="w-full">
        <div className="mb-1 flex items-center gap-2">
          <span className="font-medium" data-testid="author-comment">
            {comment.author.displayName}
          </span>
          <span className="text-muted-foreground mr-auto text-xs">
            {formatCommentDate(comment.created)}
          </span>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                colorScheme="neutral"
                size="icon-xs"
                aria-label="Comment options"
              >
                <Icon path={mdiDotsVertical} size={0.8} />
                <span className="sr-only">Comment options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem onSelect={() => onReply(comment)}>
                  <Icon path={mdiReply} size={1.5} />
                  Reply
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <AdfRenderer document={comment.body} />
      </div>
    </div>
  );
}
