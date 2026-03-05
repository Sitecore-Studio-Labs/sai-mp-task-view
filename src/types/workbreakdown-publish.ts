/**
 * Types for work breakdown publish flow (orchestration and UI).
 */

export interface PublishProgressItem {
  itemId: string;
  title: string;
  status: "pending" | "creating" | "created" | "error";
  key?: string;
  error?: string;
}

export interface PublishResult {
  draftId: string;
  created: { itemId: string; key: string; title: string }[];
  errors: { itemId: string; title: string; message: string }[];
  status: "completed" | "partial" | "failed";
}
