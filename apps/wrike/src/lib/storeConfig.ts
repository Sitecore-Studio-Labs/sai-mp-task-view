/**
 * Shared SupabaseTokenStore table/column configuration for the Wrike app.
 * Consumed by all auth routes and the repair utility so table names stay in one place.
 */
export const WRIKE_STORE_CONFIG = {
  connectionsTable: "wrike_connections",
  sessionsTable: "wrike_sessions",
  siteColumn: "wrike_site",
  projectColumn: "wrike_project",
  accountIdColumn: "wrike_account_id",
} as const;
