import { validateEnv } from "@mp/shared";
import { z } from "zod";

const serverEnvSchema = z.object({
  // Azure PostgreSQL
  DATABASE_URL: z.string().min(1),

  // Supabase (kept until remaining call sites are migrated)
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // Wrike OAuth
  WRIKE_CLIENT_ID: z.string().min(1),
  WRIKE_CLIENT_SECRET: z.string().min(1),
  WRIKE_REDIRECT_URI: z.string().url(),

  // Wrike webhooks (optional)
  WRIKE_WEBHOOK_SECRET: z.string().min(16).optional(),

  // AI (optional; route can fall back to a stub when absent)
  OPENAI_API_KEY: z.string().optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export const env = validateEnv(serverEnvSchema);
