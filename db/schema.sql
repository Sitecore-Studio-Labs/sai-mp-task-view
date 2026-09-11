-- Multi-platform schema — Azure Database for PostgreSQL.
--
-- Cumulative rebuild-from-scratch script for the MP Task View database.
--
-- Use it for:
--   • New environment setup (run once against a fresh Azure PostgreSQL database)
--   • Understanding the full intended schema at a glance
--   • Documentation
--
-- DO NOT use this file to apply incremental changes to an existing database.
--
-- Target: Azure Database for PostgreSQL 18.4
--
-- Azure / PostgreSQL notes:
--   • gen_random_uuid() is built-in on PostgreSQL 18 — no pgcrypto extension needed.
--   • Webhook tables are polled / read by API routes.
--   • Access is via Azure PostgreSQL logins and application-layer encryption of OAuth tokens.
--
-- New platform apps are added by the generator:
--   npx nx g @mp/generators:platform-app <platform> --yamlFile=capabilities/<platform>.yaml

-- ── Jira ─────────────────────────────────────────────────────────────────────
-- Scaffolded by the initial Jira app setup.

create table if not exists public.jira_connections (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  jira_site text not null,
  jira_project text not null,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  expiry timestamptz not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_jira_connections_user_id
  on public.jira_connections (user_id);

comment on table public.jira_connections is
  'One row per user representing their Jira OAuth connection. Tokens are AES-256-GCM encrypted in the app before write.';

create table if not exists public.jira_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token text unique not null,
  jira_account_id text not null,
  created_at timestamp default now(),
  expires_at timestamp not null
);

create index if not exists idx_jira_sessions_session_token
  on public.jira_sessions (session_token);

comment on table public.jira_sessions is
  'Maps opaque browser session tokens to Jira account identifiers.';

-- Setup Wizard state per user.
-- setup_completed_at = NULL means the wizard is in progress;
-- the app continues to show the blocking wizard until this is set.
create table if not exists public.jira_user_setup (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  jira_connection_id uuid not null references public.jira_connections(id) on delete cascade,
  jira_site_id text not null,
  jira_site_url text not null,
  jira_site_name text,
  default_project_id text not null,
  default_project_key text not null,
  default_project_name text,
  scope_selections jsonb,
  task_list_scope_level_id text default 'project',
  setup_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_jira_user_setup_user_id
  on public.jira_user_setup (user_id);

create index if not exists idx_jira_user_setup_connection_id
  on public.jira_user_setup (jira_connection_id);

comment on column public.jira_user_setup.scope_selections is
  'Generalized scope picker state keyed by level id (e.g. site, project).';

comment on column public.jira_user_setup.task_list_scope_level_id is
  'Level id whose key gates the task list (e.g. project for Jira).';

-- Per-Sitecore-site Jira project overrides.
-- Resolution: if a row exists for (user_id, sai_site_id), use that project;
-- otherwise fall back to jira_user_setup.default_project_key.
create table if not exists public.jira_site_project_mappings (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  jira_connection_id uuid not null references public.jira_connections(id) on delete cascade,
  sai_site_id text not null,
  sai_site_name text,
  jira_site_id text,
  jira_site_url text,
  jira_site_name text,
  jira_project_id text not null,
  jira_project_key text not null,
  jira_project_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_jira_site_project_mappings_user_id
  on public.jira_site_project_mappings (user_id);

create index if not exists idx_jira_site_project_mappings_connection_id
  on public.jira_site_project_mappings (jira_connection_id);

create unique index if not exists uq_jira_site_project_mappings_user_sai_site
  on public.jira_site_project_mappings (user_id, sai_site_id);

comment on table public.jira_site_project_mappings is
  'Maps Sitecore websites to Jira projects for context-aware task management.';

create table if not exists public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  jira_connection_id uuid references public.jira_connections(id) on delete cascade,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_sync_logs_user_id
  on public.sync_logs (user_id);

comment on table public.sync_logs is
  'Audit trail of Jira connection lifecycle and token refresh events.';

-- Jira webhook events: written by /api/webhooks/jira, read by /api/jira/sync-signal
-- for UI refresh without polling the Jira API.
create table if not exists public.jira_webhook_events (
  id uuid primary key default gen_random_uuid(),
  issue_key text not null,
  project_key text not null,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_jira_webhook_events_project_created
  on public.jira_webhook_events (project_key, created_at desc);

comment on table public.jira_webhook_events is
  'Inbound Jira webhook payloads used for instant UI synchronization.';

-- ── Wrike ─────────────────────────────────────────────────────────────────────
-- Scaffolded by the Wrike app generator.

create table if not exists public.wrike_connections (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  -- Data-centre host from the OAuth token response (e.g. https://app-us2.wrike.com).
  -- Empty string for legacy connections; repairWrikePlatformSite.ts backfills on refresh.
  wrike_site text not null default '',
  wrike_project text not null default '',
  wrike_account_id text,
  access_token_encrypted text not null,
  refresh_token_encrypted text,
  expiry timestamptz,
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_wrike_connections_user_id
  on public.wrike_connections (user_id, status);

comment on table public.wrike_connections is
  'One row per user representing their Wrike OAuth connection. Tokens are AES-256-GCM encrypted in the app before write.';

create table if not exists public.wrike_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token text unique not null,
  wrike_account_id text not null,
  created_at timestamp default now(),
  expires_at timestamp not null
);

create index if not exists idx_wrike_sessions_token
  on public.wrike_sessions (session_token);

comment on table public.wrike_sessions is
  'Maps opaque browser session tokens to Wrike contact identifiers.';

-- Wrike setup wizard state (folder selection + completion gate).
create table if not exists public.wrike_user_setup (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  wrike_connection_id uuid not null references public.wrike_connections(id) on delete cascade,
  wrike_site_id text not null,
  wrike_site_url text not null,
  wrike_site_name text,
  default_project_id text not null,
  default_project_key text not null,
  default_project_name text,
  scope_selections jsonb,
  task_list_scope_level_id text default 'folder',
  setup_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_wrike_user_setup_user_id
  on public.wrike_user_setup (user_id);

create index if not exists idx_wrike_user_setup_connection_id
  on public.wrike_user_setup (wrike_connection_id);

comment on column public.wrike_user_setup.scope_selections is
  'JSON map of setup scope level id → selection (e.g. folder).';

comment on column public.wrike_user_setup.task_list_scope_level_id is
  'Leaf scope level id whose key gates the task list (Wrike: folder).';

-- Per-Sitecore-site Wrike folder overrides (context-aware task list scope).
create table if not exists public.wrike_site_project_mappings (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  wrike_connection_id uuid not null references public.wrike_connections(id) on delete cascade,
  sai_site_id text not null,
  sai_site_name text,
  wrike_site_id text,
  wrike_site_url text,
  wrike_site_name text,
  wrike_project_id text not null,
  wrike_project_key text not null,
  wrike_project_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_wrike_site_project_mappings_user_id
  on public.wrike_site_project_mappings (user_id);

create index if not exists idx_wrike_site_project_mappings_connection_id
  on public.wrike_site_project_mappings (wrike_connection_id);

create unique index if not exists uq_wrike_site_project_mappings_user_sai_site
  on public.wrike_site_project_mappings (user_id, sai_site_id);

comment on table public.wrike_site_project_mappings is
  'Maps Sitecore websites to Wrike folders for context-aware task management.';

-- Wrike webhook events: written by /api/webhooks/wrike.
-- Wrike payloads contain task IDs only (no folder/project key), so the browser
-- invalidates all issues queries on any INSERT.
create table if not exists public.wrike_webhook_events (
  id uuid primary key default gen_random_uuid(),
  task_id text not null,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_wrike_webhook_events_task_created
  on public.wrike_webhook_events (task_id, created_at desc);

comment on table public.wrike_webhook_events is
  'Inbound Wrike webhook payloads used for instant UI synchronization.';

-- ── Application grants (optional) ────────────────────────────────────────────
-- Replace app_user with the Azure PostgreSQL login used by the Task View apps,
-- then uncomment:
--
-- grant usage on schema public to app_user;
-- grant select, insert, update, delete on all tables in schema public to app_user;
-- grant usage, select on all sequences in schema public to app_user;
-- alter default privileges in schema public
--   grant select, insert, update, delete on tables to app_user;

-- ── <next platform> ───────────────────────────────────────────────────────────
-- The generator appends new platform sections here.
-- npx nx g @mp/generators:platform-app <platform> --yamlFile=capabilities/<platform>.yaml
