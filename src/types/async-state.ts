/**
 * Shared status for async data: loading, error, empty, or success.
 * Use with explicit loading/error/empty UI (e.g. LoadingCard, ErrorCard, EmptyCard from AsyncStateCards).
 */
export type AsyncStateStatus = "loading" | "error" | "empty" | "success";
