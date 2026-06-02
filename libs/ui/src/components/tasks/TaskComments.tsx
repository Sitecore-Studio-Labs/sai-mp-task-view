"use client";

import type { PlatformComment } from "@mp/task-core";
import { usePlatformCapabilities } from "@mp/task-core";
import { useEffect, useMemo, useState } from "react";

import { groupCommentsByParent } from "../../helpers/groupCommentsByParent";
import { usePlatformComments } from "../../hooks/usePlatformComments";
import { ErrorCard, LoadingCard } from "../common/AsyncStateCards";
import { AddCommentInput, type ReplyTarget } from "./action-elements/AddCommentInput";
import { CommentCard } from "./elements/CommentCard";

interface TaskCommentsProps {
  taskKey: string | null;
}

function CommentThread({
  comment,
  replies,
  onReply,
}: {
  comment: PlatformComment;
  replies: PlatformComment[];
  onReply: (comment: PlatformComment) => void;
}) {
  return (
    <div className="space-y-3">
      <CommentCard comment={comment} onReply={onReply} />
      {replies.length > 0 && (
        <div className="border-border ml-6 space-y-3 border-l pl-3">
          {replies.map((reply) => (
            <CommentCard comment={reply} key={reply.id} onReply={onReply} />
          ))}
        </div>
      )}
    </div>
  );
}

/** Remount when `taskKey` changes so reply state resets without setState-in-effect. */
export function TaskComments({ taskKey }: TaskCommentsProps) {
  return <TaskCommentsInner key={taskKey ?? "__none__"} taskKey={taskKey} />;
}

function TaskCommentsInner({ taskKey }: TaskCommentsProps) {
  const { hasCommentReplies } = usePlatformCapabilities();
  const { data: commentsResponse, isLoading, isError, refetch } = usePlatformComments(taskKey);
  const [replyTo, setReplyTo] = useState<ReplyTarget>(null);

  const comments = useMemo(() => commentsResponse?.comments ?? [], [commentsResponse?.comments]);

  const commentThreads = useMemo(
    () => (hasCommentReplies ? groupCommentsByParent(comments) : null),
    [comments, hasCommentReplies],
  );

  useEffect(() => {
    if (taskKey) {
      void refetch();
    }
  }, [taskKey, refetch]);

  return (
    <div className="wrapper space-y-4">
      <h4 className="text-sm font-semibold">Comments ({comments.length})</h4>

      <AddCommentInput
        issueKey={taskKey ?? ""}
        replyTo={replyTo ?? undefined}
        onCommentAdded={() => {
          void refetch();
          setReplyTo(null);
        }}
        onCancelReply={() => setReplyTo(null)}
      />

      {isLoading && <LoadingCard message="Loading comments…" />}
      {isError && <ErrorCard message="Could not load comments." onRetry={() => void refetch()} />}
      {!isLoading && !isError && (
        <div className="flex flex-col-reverse gap-4 text-sm">
          {comments.length > 0 ? (
            commentThreads ? (
              commentThreads.map(({ comment, replies }) => (
                <CommentThread
                  comment={comment}
                  key={comment.id}
                  replies={replies}
                  onReply={(c) => setReplyTo({ id: c.id, author: c.author })}
                />
              ))
            ) : (
              comments.map((comment: PlatformComment) => (
                <CommentCard
                  comment={comment}
                  key={comment.id}
                  onReply={(c) => setReplyTo({ id: c.id, author: c.author })}
                />
              ))
            )
          ) : (
            <p className="text-muted-foreground text-sm">No comments yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
