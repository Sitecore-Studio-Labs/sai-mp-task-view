import { getPool } from "@mp/db";
import { PostgresTokenStore } from "@mp/token-storage";

import { WRIKE_STORE_CONFIG } from "./storeConfig";

export function createWrikeTokenStore(): PostgresTokenStore {
  return new PostgresTokenStore(getPool(), WRIKE_STORE_CONFIG);
}
