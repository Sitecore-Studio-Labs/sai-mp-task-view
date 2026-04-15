/**
 * Thrown when a platform API returns a client-level error (4xx).
 * Both JiraAdapter and WrikeAdapter should throw this for validation and auth errors
 * so the service/route layer can handle them uniformly.
 */
export class PlatformClientError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly platform: "jira" | "wrike",
  ) {
    super(message);
    this.name = "PlatformClientError";
  }
}
