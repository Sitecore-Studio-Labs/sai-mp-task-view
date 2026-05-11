import axios from "axios";

/**
 * Extracts a user-readable error message from an Axios API response.
 * Assumes BFF routes return { error: string } on failure.
 */
export function extractApiError(err: unknown, fallback = "An unexpected error occurred."): string {
  if (axios.isAxiosError(err)) {
    const msg = (err.response?.data as Record<string, unknown> | undefined)?.error;
    if (typeof msg === "string") return msg;
  }
  if (err instanceof Error) return err.message;
  return fallback;
}
