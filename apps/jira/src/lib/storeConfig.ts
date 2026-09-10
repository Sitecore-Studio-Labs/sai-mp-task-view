import type { TokenStoreConfig } from "@mp/token-storage";

/**
 * Shared PostgresTokenStore table/column configuration for the Jira app.
 * Matches the Jira defaults inside PostgresTokenStore; kept explicit so call
 * sites do not silently depend on those defaults.
 */
export const JIRA_STORE_CONFIG: TokenStoreConfig = {
  connectionsTable: "jira_connections",
  sessionsTable: "jira_sessions",
  siteColumn: "jira_site",
  projectColumn: "jira_project",
  accountIdColumn: "jira_account_id",
};
