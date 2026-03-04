import { JiraComment } from '@/types/jira';
import { AdfRenderer } from '@/components/common/AdfRenderer';
import { UserAvatar } from './UserAvatar';
import { formatCommentDate } from '@/helpers/formatCommentDate';
import { Button } from '@/components/ui/button';
import { Icon } from '@/lib/icon';
import { mdiDotsVertical, mdiReply } from '@mdi/js';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface CommentCardProps {
  comment: JiraComment;
  onReply: (comment: JiraComment) => void;
}

export function CommentCard({ comment, onReply }: CommentCardProps) {
  return (
    <div key={comment.id} className="flex gap-2 items-start">
      <UserAvatar user={comment.author} size="sm" />
      <div className="w-full">
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">{comment.author.displayName}</span>
          <span className="text-xs text-muted-foreground mr-auto">
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
