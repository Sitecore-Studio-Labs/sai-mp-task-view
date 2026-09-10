import { query } from "@mp/db";
import type {
  PlatformScopeSelection,
  PlatformSetupMapping,
  PlatformSetupRecord,
  UpsertPlatformSetupMappingItem,
  UpsertPlatformSetupPayload,
} from "@mp/task-core";

import { createWrikeTokenStore } from "@/lib/tokenStore";
import { isPlaceholderWrikeSite, WRIKE_MISSING_HOST_MESSAGE } from "@/lib/wrikeHost";

export type UserId = string;

const WRIKE_TASK_LIST_LEVEL = "folder";

function dbErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}

function toIsoString(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

function toIsoStringOrNull(value: unknown): string | null {
  if (value == null) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  return String(value);
}

function buildScopeSelectionsFromLegacy(
  row: Record<string, unknown>,
): Record<string, PlatformScopeSelection> {
  const key = String(row["default_project_key"] ?? "");
  if (!key) return {};
  return {
    [WRIKE_TASK_LIST_LEVEL]: {
      id: String(row["default_project_id"] ?? key),
      key,
      name: (row["default_project_name"] as string | null) ?? key,
    },
  };
}

const mapSetupRow = (row: Record<string, unknown>): PlatformSetupRecord => {
  const raw = row["scope_selections"];
  const scopeSelections: Record<string, PlatformScopeSelection> =
    raw && typeof raw === "object" && !Array.isArray(raw)
      ? (raw as Record<string, PlatformScopeSelection>)
      : buildScopeSelectionsFromLegacy(row);

  const leaf = scopeSelections[WRIKE_TASK_LIST_LEVEL];

  return {
    id: String(row["id"]),
    userId: String(row["user_id"]),
    connectionId: String(row["wrike_connection_id"]),
    scopeSelections,
    taskListScopeLevelId:
      (row["task_list_scope_level_id"] as string | null) ?? WRIKE_TASK_LIST_LEVEL,
    siteId: String(row["wrike_site_id"] ?? ""),
    siteUrl: String(row["wrike_site_url"] ?? ""),
    siteName: (row["wrike_site_name"] as string | null) ?? null,
    defaultProjectId: leaf?.id ?? String(row["default_project_id"] ?? ""),
    defaultProjectKey: leaf?.key ?? String(row["default_project_key"] ?? ""),
    defaultProjectName: leaf?.name ?? (row["default_project_name"] as string | null) ?? null,
    setupCompletedAt: toIsoStringOrNull(row["setup_completed_at"]),
    createdAt: toIsoString(row["created_at"]),
    updatedAt: toIsoString(row["updated_at"]),
  };
};

const mapMappingRow = (row: Record<string, unknown>): PlatformSetupMapping => ({
  id: String(row["id"]),
  userId: String(row["user_id"]),
  connectionId: String(row["wrike_connection_id"]),
  externalResourceId: String(row["sai_site_id"]),
  externalResourceName: (row["sai_site_name"] as string | null) ?? null,
  siteId: (row["wrike_site_id"] as string | null) ?? null,
  siteUrl: (row["wrike_site_url"] as string | null) ?? null,
  siteName: (row["wrike_site_name"] as string | null) ?? null,
  projectId: String(row["wrike_project_id"]),
  projectKey: String(row["wrike_project_key"]),
  projectName: (row["wrike_project_name"] as string | null) ?? null,
  createdAt: toIsoString(row["created_at"]),
  updatedAt: toIsoString(row["updated_at"]),
});

export const hasUserConnection = async (userId: UserId): Promise<boolean> => {
  const connection = await createWrikeTokenStore().getConnection(userId);
  return connection !== null;
};

export const getUserConnection = async (userId: UserId) => {
  const connection = await createWrikeTokenStore().getConnection(userId);
  if (!connection) {
    throw new Error("No active Wrike connection found for user.");
  }

  const platformSite = connection.platformSite;
  if (isPlaceholderWrikeSite(platformSite)) {
    throw new Error(WRIKE_MISSING_HOST_MESSAGE);
  }

  return {
    connectionId: connection.connectionId,
    platformSite,
    platformProject: connection.platformProject,
  };
};

export const getUserSetup = async (userId: UserId): Promise<PlatformSetupRecord | null> => {
  try {
    const { rows } = await query<Record<string, unknown>>(
      `select * from wrike_user_setup where user_id = $1 limit 1`,
      [userId],
    );
    const data = rows[0] ?? null;
    return data ? mapSetupRow(data) : null;
  } catch (err) {
    throw new Error(`Failed to fetch setup: ${dbErrorMessage(err)}`);
  }
};

export const upsertUserSetup = async (
  userId: UserId,
  connectionId: string,
  params: UpsertPlatformSetupPayload,
): Promise<PlatformSetupRecord> => {
  const taskListScopeLevelId = params.taskListScopeLevelId ?? WRIKE_TASK_LIST_LEVEL;
  const scopeSelections = params.scopeSelections ?? {};

  const leaf = scopeSelections[taskListScopeLevelId];
  if (!leaf?.id || !leaf.key) {
    throw new Error(`Wrike setup requires a 'folder' scope selection.`);
  }

  const connection = await getUserConnection(userId);

  let data: Record<string, unknown> | undefined;
  try {
    const { rows } = await query<Record<string, unknown>>(
      `insert into wrike_user_setup (
         user_id, wrike_connection_id, wrike_site_id, wrike_site_url, wrike_site_name,
         default_project_id, default_project_key, default_project_name,
         scope_selections, task_list_scope_level_id, updated_at
       )
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10, now())
       on conflict (user_id) do update set
         wrike_connection_id = excluded.wrike_connection_id,
         wrike_site_id = excluded.wrike_site_id,
         wrike_site_url = excluded.wrike_site_url,
         wrike_site_name = excluded.wrike_site_name,
         default_project_id = excluded.default_project_id,
         default_project_key = excluded.default_project_key,
         default_project_name = excluded.default_project_name,
         scope_selections = excluded.scope_selections,
         task_list_scope_level_id = excluded.task_list_scope_level_id,
         updated_at = now()
       returning *`,
      [
        userId,
        connectionId,
        connection.platformSite,
        connection.platformSite,
        null,
        leaf.id,
        leaf.key,
        leaf.name ?? null,
        JSON.stringify(scopeSelections),
        taskListScopeLevelId,
      ],
    );
    data = rows[0];
  } catch (err) {
    throw new Error(`Failed to upsert setup: ${dbErrorMessage(err)}`);
  }
  if (!data) {
    throw new Error("Failed to upsert setup: Unknown error");
  }

  await createWrikeTokenStore().updateProject(userId, leaf.key);

  return mapSetupRow(data);
};

export const completeUserSetup = async (userId: UserId): Promise<void> => {
  try {
    await query(
      `update wrike_user_setup
       set setup_completed_at = now(), updated_at = now()
       where user_id = $1`,
      [userId],
    );
  } catch (err) {
    throw new Error(`Failed to complete setup: ${dbErrorMessage(err)}`);
  }
};

/** Deletes the user's Wrike setup config and website-to-folder mappings. */
export const disconnectAndWipeUserWrike = async (userId: UserId): Promise<void> => {
  try {
    await query(`delete from wrike_site_project_mappings where user_id = $1`, [userId]);
  } catch (err) {
    throw new Error(`Failed to delete Wrike setup mappings: ${dbErrorMessage(err)}`);
  }
  try {
    await query(`delete from wrike_user_setup where user_id = $1`, [userId]);
  } catch (err) {
    throw new Error(`Failed to delete Wrike setup: ${dbErrorMessage(err)}`);
  }
};

export const getUserSetupMappings = async (userId: UserId): Promise<PlatformSetupMapping[]> => {
  try {
    const { rows } = await query<Record<string, unknown>>(
      `select * from wrike_site_project_mappings where user_id = $1 order by created_at asc`,
      [userId],
    );
    return rows.map((row) => mapMappingRow(row));
  } catch (err) {
    throw new Error(`Failed to fetch setup mappings: ${dbErrorMessage(err)}`);
  }
};

export const upsertUserSetupMappings = async (
  userId: UserId,
  connectionId: string,
  mappings: UpsertPlatformSetupMappingItem[],
): Promise<PlatformSetupMapping[]> => {
  const connection = await getUserConnection(userId);

  try {
    await query(`delete from wrike_site_project_mappings where user_id = $1`, [userId]);
  } catch (err) {
    throw new Error(`Failed to clear existing mappings: ${dbErrorMessage(err)}`);
  }

  if (mappings.length === 0) return [];

  const values: unknown[] = [];
  const placeholders = mappings.map((m, index) => {
    const offset = index * 10;
    values.push(
      userId,
      connectionId,
      m.externalResourceId,
      m.externalResourceName ?? null,
      m.siteId || connection.platformSite,
      m.siteUrl || connection.platformSite,
      m.siteName ?? null,
      m.projectId,
      m.projectKey,
      m.projectName ?? null,
    );
    return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9}, $${offset + 10})`;
  });

  try {
    const { rows } = await query<Record<string, unknown>>(
      `insert into wrike_site_project_mappings (
         user_id, wrike_connection_id, sai_site_id, sai_site_name,
         wrike_site_id, wrike_site_url, wrike_site_name,
         wrike_project_id, wrike_project_key, wrike_project_name
       ) values ${placeholders.join(", ")}
       returning *`,
      values,
    );
    return rows.map((row) => mapMappingRow(row));
  } catch (err) {
    throw new Error(`Failed to insert mappings: ${dbErrorMessage(err)}`);
  }
};
