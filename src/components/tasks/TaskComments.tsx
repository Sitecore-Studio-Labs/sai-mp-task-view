"use client";

import { useEffect, useState } from "react";

import { ErrorCard, LoadingCard } from "@/components/common/AsyncStateCards";
import { useTaskComments } from "@/hooks/useTaskComments";
import type { PlatformComment, PlatformUser } from "@/types/platform-entities";

import { AddCommentInput } from "./action-elements/AddCommentInput";
import { CommentCard } from "./elements/CommentCard";

interface TaskCommentsProps {
  taskKey: string | null;
}

export type ReplyTarget = {
  id: string;
  author: PlatformUser;
} | null;

export function TaskComments({ taskKey }: TaskCommentsProps) {
  const { data: commentsResponse, isLoading, isError, refetch } = useTaskComments(taskKey);

  const comments = commentsResponse?.comments || [];

  const [replyTo, setReplyTo] = useState<ReplyTarget>(null);

  useEffect(() => {
    const resetReplyTo = () => {
      setReplyTo(null);
    };
    if (taskKey) {
      refetch();
      resetReplyTo();
    }
  }, [taskKey, refetch]);

  return (
    <div className="wrapper space-y-4">
      <h4 className="text-sm font-semibold">Comments ({comments.length})</h4>

      <AddCommentInput
        taskKey={taskKey || ""}
        replyTo={replyTo || undefined}
        onCommentAdded={() => {
          refetch();
          setReplyTo(null);
        }}
        onCancelReply={() => setReplyTo(null)}
      />

      {isLoading && <LoadingCard message="Loading comments…" />}
      {isError && <ErrorCard message="Could not load comments." onRetry={() => refetch()} />}
      {!isLoading && !isError && (
        <div className="flex flex-col-reverse gap-4 text-sm">
          {comments.length > 0 ? (
            comments.map((comment: PlatformComment) => (
              <CommentCard
                comment={comment}
                key={comment.id}
                onReply={(c) => setReplyTo({ id: c.id, author: c.author! })}
              />
            ))
          ) : (
            <p className="text-muted-foreground text-sm">No comments yet.</p>
          )}
        </div>
      )}
    </div>
  );
}
