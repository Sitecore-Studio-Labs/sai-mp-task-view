import type { ZodType } from "zod";

/**
 * Validates `process.env` against `schema` and returns the typed result.
 *
 * - On validation failure: throws with a human-readable list of missing/invalid vars.
 * - SKIP_ENV_VALIDATION=true: skips validation and returns a partial cast — useful
 *   in CI build steps that don't need credentials at compile time.
 */
export function validateEnv<T>(schema: ZodType<T>): T {
  if (process.env["SKIP_ENV_VALIDATION"] === "true") {
    return process.env as unknown as T;
  }

  const result = schema.safeParse(process.env);

  if (!result.success) {
    const flat = result.error.flatten();
    const fieldErrors = flat.fieldErrors as Record<string, string[] | undefined>;
    const lines = Object.entries(fieldErrors)
      .map(([key, msgs]) => `  ${key}: ${(msgs ?? []).join(", ")}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${lines}`);
  }

  return result.data;
}
