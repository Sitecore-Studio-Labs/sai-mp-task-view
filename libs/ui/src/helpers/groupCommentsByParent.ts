import type { PlatformComment } from "@mp/task-core";

export interface CommentThreadNode {
  comment: PlatformComment;
  replies: PlatformComment[];
}

/**
 * Groups a flat comment list into root comments and their direct replies.
 * Single-level nesting; shadow TaskComments for deeper thread UIs.
 */
export function groupCommentsByParent(comments: PlatformComment[]): CommentThreadNode[] {
  const roots: PlatformComment[] = [];
  const childrenByParent = new Map<string, PlatformComment[]>();

  for (const comment of comments) {
    if (comment.parentCommentId) {
      const siblings = childrenByParent.get(comment.parentCommentId) ?? [];
      siblings.push(comment);
      childrenByParent.set(comment.parentCommentId, siblings);
    } else {
      roots.push(comment);
    }
  }

  return roots.map((comment) => ({
    comment,
    replies: childrenByParent.get(comment.id) ?? [],
  }));
}
