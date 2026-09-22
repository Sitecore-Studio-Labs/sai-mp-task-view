import { validateEnv } from "@mp/shared";
import { z } from "zod";

const serverEnvSchema = z.object({
  // Azure PostgreSQL
  DATABASE_URL: z.string().min(1),

  // Wrike OAuth
  WRIKE_CLIENT_ID: z.string().min(1),
  WRIKE_CLIENT_SECRET: z.string().min(1),
  WRIKE_REDIRECT_URI: z.string().url(),

  // Wrike webhooks (optional)
  WRIKE_WEBHOOK_SECRET: z.string().min(16).optional(),

  // Azure Web PubSub (optional — real-time push; falls back to polling when absent)
  AZURE_WEBPUBSUB_CONNECTION_STRING: z.string().min(1).optional(),

  // AI (optional; route can fall back to a stub when absent)
  OPENAI_API_KEY: z.string().optional(),

  // App
  NEXT_PUBLIC_APP_URL: z.string().url().optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export const env = validateEnv(serverEnvSchema);
