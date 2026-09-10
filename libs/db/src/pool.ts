import { Pool, type QueryResult, type QueryResultRow } from "pg";

const globalForPg = globalThis as unknown as { __mpPgPool?: Pool };

function requireDatabaseUrl(): string {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not configured. Set it in your .env.local file.");
  }
  return connectionString;
}

/**
 * Azure Database for PostgreSQL requires TLS. Local Postgres on loopback
 * typically does not — unless the URL explicitly sets sslmode=require.
 */
export function resolveSsl(connectionString: string): boolean | { rejectUnauthorized: boolean } {
  try {
    const url = new URL(connectionString);
    const sslMode = url.searchParams.get("sslmode");
    const isLocal =
      url.hostname === "localhost" || url.hostname === "127.0.0.1" || url.hostname === "::1";

    if (sslMode === "disable" || (isLocal && sslMode !== "require")) {
      return false;
    }
  } catch {
    // Not a parseable URL — require TLS for hosted Azure.
  }
  return { rejectUnauthorized: true };
}

/**
 * Server-only Postgres pool. Stored on globalThis so Next.js hot reload and
 * serverless reuse do not leak connections. Never import this from client code.
 */
export function getPool(): Pool {
  if (typeof process.versions?.node !== "string") {
    throw new Error("getPool() is server-only and must not run in the browser.");
  }

  if (globalForPg.__mpPgPool) return globalForPg.__mpPgPool;

  const connectionString = requireDatabaseUrl();
  const pool = new Pool({
    connectionString,
    max: 5,
    ssl: resolveSsl(connectionString),
  });

  globalForPg.__mpPgPool = pool;
  return pool;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<QueryResult<T>> {
  return getPool().query<T>(text, params);
}

/** Ends the singleton pool. Used in tests; production should leave it open. */
export async function closePool(): Promise<void> {
  const pool = globalForPg.__mpPgPool;
  if (!pool) return;
  globalForPg.__mpPgPool = undefined;
  await pool.end();
}
