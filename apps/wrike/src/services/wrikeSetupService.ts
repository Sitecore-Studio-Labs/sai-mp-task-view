import type {
  PlatformScopeSelection,
  PlatformSetupMapping,
  PlatformSetupRecord,
  UpsertPlatformSetupMappingItem,
  UpsertPlatformSetupPayload,
} from "@mp/task-core";

import { createSupabaseServerClient } from "@/lib/supabaseClient";

export type UserId = string;

const WRIKE_TASK_LIST_LEVEL = "folder";

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
    setupCompletedAt: (row["setup_completed_at"] as string | null) ?? null,
    createdAt: String(row["created_at"]),
    updatedAt: String(row["updated_at"]),
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
  createdAt: String(row["created_at"]),
  updatedAt: String(row["updated_at"]),
});

export const hasUserConnection = async (userId: UserId): Promise<boolean> => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("wrike_connections")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return !error && !!data;
};

export const getUserConnection = async (userId: UserId) => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("wrike_connections")
    .select("id, wrike_site, wrike_project")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (error || !data) {
    throw new Error("No active Wrike connection found for user.");
  }

  // TODO: If your platform uses dynamic hosts (hasDynamicHost: true),
  // validate the stored site here with isPlaceholderWrikeSite() and throw if missing.

  return {
    connectionId: String(data.id),
    platformSite: String((data as Record<string, unknown>)["wrike_site"] ?? ""),
    platformProject: String((data as Record<string, unknown>)["wrike_project"] ?? ""),
  };
};

export const getUserSetup = async (userId: UserId): Promise<PlatformSetupRecord | null> => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("wrike_user_setup")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error(`Failed to fetch setup: ${error.message}`);
  return data ? mapSetupRow(data as Record<string, unknown>) : null;
};

export const upsertUserSetup = async (
  userId: UserId,
  connectionId: string,
  params: UpsertPlatformSetupPayload,
): Promise<PlatformSetupRecord> => {
  const supabase = createSupabaseServerClient();
  const taskListScopeLevelId = params.taskListScopeLevelId ?? WRIKE_TASK_LIST_LEVEL;
  const scopeSelections = params.scopeSelections ?? {};

  const leaf = scopeSelections[taskListScopeLevelId];
  if (!leaf?.id || !leaf.key) {
    throw new Error(`Wrike setup requires a 'folder' scope selection.`);
  }

  const connection = await getUserConnection(userId);

  const { data, error } = await supabase
    .from("wrike_user_setup")
    .upsert(
      {
        user_id: userId,
        wrike_connection_id: connectionId,
        wrike_site_id: connection.platformSite,
        wrike_site_url: connection.platformSite,
        wrike_site_name: null,
        default_project_id: leaf.id,
        default_project_key: leaf.key,
        default_project_name: leaf.name ?? null,
        scope_selections: scopeSelections,
        task_list_scope_level_id: taskListScopeLevelId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error || !data) {
    throw new Error(`Failed to upsert setup: ${error?.message ?? "Unknown error"}`);
  }

  await supabase
    .from("wrike_connections")
    .update({ wrike_project: leaf.key, updated_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "active");

  return mapSetupRow(data as Record<string, unknown>);
};

export const completeUserSetup = async (userId: UserId): Promise<void> => {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase
    .from("wrike_user_setup")
    .update({ setup_completed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) throw new Error(`Failed to complete setup: ${error.message}`);
};

export const getUserSetupMappings = async (userId: UserId): Promise<PlatformSetupMapping[]> => {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("wrike_site_project_mappings")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`Failed to fetch setup mappings: ${error.message}`);
  return (data ?? []).map((row) => mapMappingRow(row as Record<string, unknown>));
};

export const upsertUserSetupMappings = async (
  userId: UserId,
  connectionId: string,
  mappings: UpsertPlatformSetupMappingItem[],
): Promise<PlatformSetupMapping[]> => {
  const supabase = createSupabaseServerClient();
  const connection = await getUserConnection(userId);

  const { error: deleteError } = await supabase
    .from("wrike_site_project_mappings")
    .delete()
    .eq("user_id", userId);
  if (deleteError) throw new Error(`Failed to clear existing mappings: ${deleteError.message}`);

  if (mappings.length === 0) return [];

  const rows = mappings.map((m) => ({
    user_id: userId,
    wrike_connection_id: connectionId,
    sai_site_id: m.externalResourceId,
    sai_site_name: m.externalResourceName ?? null,
    wrike_site_id: m.siteId ?? connection.platformSite,
    wrike_site_url: m.siteUrl ?? connection.platformSite,
    wrike_site_name: m.siteName ?? null,
    wrike_project_id: m.projectId,
    wrike_project_key: m.projectKey,
    wrike_project_name: m.projectName ?? null,
  }));

  const { data, error } = await supabase.from("wrike_site_project_mappings").insert(rows).select();
  if (error) throw new Error(`Failed to insert mappings: ${error.message}`);
  return (data ?? []).map((row) => mapMappingRow(row as Record<string, unknown>));
};
