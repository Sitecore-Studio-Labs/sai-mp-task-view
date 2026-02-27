/**
 * Shared status for async data: loading, error, empty, or success.
 * Prefer explicit loading/error/empty UI over a single generic "DataState" component.
 */
export type AsyncStateStatus = "loading" | "error" | "empty" | "success";
