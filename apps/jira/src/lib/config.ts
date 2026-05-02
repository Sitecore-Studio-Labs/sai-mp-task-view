import { z } from "zod";

/**
 * Server-side environment schema.
 *
 * Validated once at module load time — if a required variable is missing or
 * malformed the process throws immediately with a clear message rather than
 * failing silently at runtime.
 *
 * Set SKIP_ENV_VALIDATION=true to bypass (CI steps that don't need credentials,
 * e.g. `next build` in a Docker layer that bakes in env later).
 */
const serverEnvSchema = z.object({
  // ── Supabase ────────────────────────────────────────────────────────────
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // ── Jira OAuth ──────────────────────────────────────────────────────────
  JIRA_CLIENT_ID: z.string().min(1),
  JIRA_CLIENT_SECRET: z.string().min(1),
  JIRA_REDIRECT_URI: z.string().url(),

  // ── Jira Webhooks (optional — if omitted, signature check is skipped) ───
  JIRA_WEBHOOK_SECRET: z.string().min(16).optional(),

  // ── AI (optional — falls back to stub when absent) ──────────────────────
  OPENAI_API_KEY: z.string().optional(),

  // ── App ─────────────────────────────────────────────────────────────────
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
  NEXT_PUBLIC_ENABLE_AI_TASK_CREATION: z.enum(["true", "false"]).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function validateEnv(): ServerEnv {
  if (process.env.SKIP_ENV_VALIDATION === "true") {
    return process.env as unknown as ServerEnv;
  }

  const result = serverEnvSchema.safeParse(process.env);
  if (!result.success) {
    const errors = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid server environment configuration:\n${errors}`);
  }
  return result.data;
}

export const env = validateEnv();
