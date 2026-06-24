"use client";

import type { AddCommentPayload, PlatformUser } from "@mp/task-core";
import { usePlatformCapabilities } from "@mp/task-core";
import { useState } from "react";

import { usePlatformAddComment } from "../../../hooks/usePlatformComments";
import { usePlatformCurrentUser } from "../../../hooks/usePlatformCurrentUser";
import { useTracking } from "../../../hooks/useTracking";
import { Button } from "../../ui/button";
import { Input } from "../../ui/input";
import { Spinner } from "../../ui/spinner";
import { UserAvatar } from "../elements/UserAvatar";

export type ReplyTarget = {
  id: string;
  author: PlatformUser;
} | null;

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
  const { platformName, hasCommentReplies } = usePlatformCapabilities();
  const { mutate: addComment, status } = usePlatformAddComment();
  const { data: currentUser } = usePlatformCurrentUser();
  const { business } = useTracking();

  const isLoading = status === "pending";

  const handleSubmit = () => {
    if (!text.trim()) return;
    const payload: AddCommentPayload = { issueIdOrKey: issueKey, text };
    if (replyTo && hasCommentReplies) {
      payload.replyToCommentId = replyTo.id;
      payload.replyToAuthorId = replyTo.author.accountId;
      payload.replyToAuthorDisplayName = replyTo.author.displayName;
    }
    addComment(payload, {
      onSuccess: () => {
        setText("");
        business.featureUsed({ featureKey: "comments", platform: platformName });
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
          data-testid="add-comment-input"
        />
        <Button
          size="sm"
          disabled={!text.trim() || isLoading}
          onClick={handleSubmit}
          className="min-w-14"
          data-testid="post-comment-button"
        >
          {isLoading ? <Spinner /> : "Post"}
        </Button>
      </div>
      {replyTo && hasCommentReplies && (
        <div className="text-muted-foreground flex items-center gap-2 text-xs">
          Replying to <strong>{replyTo.author.displayName}</strong>
          <Button variant="link" size="xs" onClick={() => onCancelReply?.()}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
