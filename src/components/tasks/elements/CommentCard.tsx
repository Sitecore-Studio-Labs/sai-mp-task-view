import { JiraComment } from '@/types/jira';
import { AdfRenderer } from '@/components/common/AdfRenderer';
import { UserAvatar } from './UserAvatar';

interface CommentCardProps {
  comment: JiraComment;
}

export function CommentCard({ comment }: CommentCardProps) {
  return (
    <div key={comment.id} className="flex gap-2 items-start">
      <UserAvatar user={comment.author} size="sm" />
      <div>
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium">{comment.author.displayName}</span>
          <span className="text-xs text-muted-foreground">
            {new Date(comment.created).toLocaleDateString()}
          </span>
        </div>
        <AdfRenderer document={comment.body} />
      </div>
    </div>
  );
}
