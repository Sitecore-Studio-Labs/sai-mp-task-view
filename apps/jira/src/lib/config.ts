import { validateEnv } from "@mp/shared";
import { z } from "zod";

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

export const env = validateEnv(serverEnvSchema);
