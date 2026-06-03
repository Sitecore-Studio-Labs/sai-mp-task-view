import { PlatformApiError } from "@mp/task-core";

/**
 * Parses Jira's structured error response body.
 * Jira returns: { errorMessages: string[], errors: Record<fieldName, message> }
 */
export function extractJiraError(responseData: unknown): {
  message: string;
  fieldErrors?: Record<string, string>;
} {
  if (responseData == null || typeof responseData !== "object") {
    return { message: "Bad request." };
  }

  const d = responseData as {
    errorMessages?: string[];
    errors?: Record<string, string>;
  };

  const messages: string[] = [...(d.errorMessages ?? [])];
  const fieldErrors: Record<string, string> = {};

  if (d.errors && typeof d.errors === "object") {
    for (const [field, msg] of Object.entries(d.errors)) {
      messages.push(`${field}: ${msg}`);
      fieldErrors[field] = msg;
    }
  }

  return {
    message: messages.length > 0 ? messages.join(" ") : "Bad request.",
    ...(Object.keys(fieldErrors).length > 0 && { fieldErrors }),
  };
}

/**
 * Throws a PlatformApiError with a parsed Jira error message.
 * Use in JiraAdapter catch blocks as a drop-in for inline formatJiraErrorResponse calls.
 */
export function throwJiraApiError(responseData: unknown, statusCode: number): never {
  const { message, fieldErrors } = extractJiraError(responseData);
  throw new PlatformApiError(message, statusCode, "JIRA_API_ERROR", fieldErrors);
}
