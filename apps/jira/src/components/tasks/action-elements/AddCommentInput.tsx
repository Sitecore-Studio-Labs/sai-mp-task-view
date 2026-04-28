"use client";

import { Button, Input, Spinner } from "@mp/ui";
import { useState } from "react";

import { useAddComment } from "../../../hooks/useAddComment";
import { useJiraCurrentUser } from "../../../hooks/useJiraCurrentUser";
import { CreateCommentPayload } from "../../../types/jira";
import { UserAvatar } from "../elements/UserAvatar";
import { ReplyTarget } from "../TaskComments";

interface AddCommentInputProps {
  issueKey: string;
  replyTo?: ReplyTarget;
  onCommentAdded?: () => void;
  onCancelReply?: () => void;
}

export function AddCommentInput({
  issueKey,
  replyTo,
  onCommentAdded,
  onCancelReply,
}: AddCommentInputProps) {
  const [text, setText] = useState("");
  const { mutate: addComment, status } = useAddComment();
  const { data: currentUser } = useJiraCurrentUser();

  const isLoading = status === "pending";

  const handleSubmit = () => {
    if (!text.trim()) return;
    const payload: CreateCommentPayload = {
      issueIdOrKey: issueKey,
      text,
    };
    if (replyTo) {
      payload.replyToCommentId = replyTo.id;
      payload.replyToAuthorAccountId = replyTo.author.accountId;
      payload.replyToAuthorDisplayName = replyTo.author.displayName;
    }
    addComment(payload, {
      onSuccess: () => {
        setText("");
        onCommentAdded?.();
      },
    });
  };

  return (
    <div className="mb-6 space-y-1">
      <div className="flex items-center gap-2">
        <UserAvatar size="sm" user={currentUser} />
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a comment..."
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSubmit();
            }
          }}
          className="h-8 text-sm"
        />
        <Button
          size="sm"
          disabled={!text.trim() || isLoading}
          onClick={handleSubmit}
          className="min-w-14"
        >
          {isLoading ? <Spinner /> : "Post"}
        </Button>
      </div>
      {replyTo && (
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          Replying to <strong>{replyTo.author.displayName}</strong>
          <Button variant="link" size="xs" onClick={() => onCancelReply && onCancelReply()}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
