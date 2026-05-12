/**
 * Structured error thrown by platform adapters.
 * All platform-specific error classes (e.g. JiraClientError) extend this.
 * Catch with `instanceof PlatformApiError` in route handlers for any platform.
 */
export class PlatformApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly platformCode?: string,
    public readonly fieldErrors?: Record<string, string>,
  ) {
    super(message);
    this.name = "PlatformApiError";
    // Restore prototype chain broken by TypeScript class transpilation.
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
