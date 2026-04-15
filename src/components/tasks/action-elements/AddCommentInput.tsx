"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { useAddTaskComment } from "@/hooks/useAddTaskComment";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import type { PlatformCreateCommentPayload } from "@/types/platform-entities";

import { UserAvatar } from "../elements/UserAvatar";
import type { ReplyTarget } from "../TaskComments";

interface AddCommentInputProps {
  taskKey: string;
  replyTo?: ReplyTarget;
  onCommentAdded?: () => void;
  onCancelReply?: () => void;
}

export function AddCommentInput({
  taskKey,
  replyTo,
  onCommentAdded,
  onCancelReply,
}: AddCommentInputProps) {
  const [text, setText] = useState("");
  const { mutate: addComment, status } = useAddTaskComment();
  const { data: currentUser } = useCurrentUser();

  const isLoading = status === "pending";

  const handleSubmit = () => {
    if (!text.trim()) return;
    const payload: PlatformCreateCommentPayload = {
      taskId: taskKey,
      text,
      ...(replyTo && {
        replyToAuthorId: replyTo.author.id,
        replyToAuthorName: replyTo.author.displayName,
      }),
    };
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
