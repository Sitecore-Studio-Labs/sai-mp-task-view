import { getPool } from "@mp/db";
import { PostgresTokenStore } from "@mp/token-storage";

import { JIRA_STORE_CONFIG } from "./storeConfig";

export function createJiraTokenStore(): PostgresTokenStore {
  return new PostgresTokenStore(getPool(), JIRA_STORE_CONFIG);
}
