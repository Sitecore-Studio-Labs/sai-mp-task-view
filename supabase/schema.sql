-- Supabase schema for Jira integration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query) or via Supabase CLI.

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

create table if not exists public.jira_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token text unique not null,
  jira_account_id text not null,
  created_at timestamp default now(),
  expires_at timestamp not null
);

create index if not exists idx_jira_sessions_session_token on public.jira_sessions(session_token);

-- Setup Wizard state per user.
-- Created/updated during the Setup Wizard flow after the user selects a Jira instance and default project.
-- setup_completed_at = NULL means the wizard has been started but not completed;
-- the app must continue to show the blocking wizard until this is set.
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
  -- NULL = wizard in progress; non-NULL = wizard completed and Task View is accessible
  setup_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id)
);

create index if not exists idx_jira_user_setup_user_id
  on public.jira_user_setup (user_id);

create index if not exists idx_jira_user_setup_connection_id
  on public.jira_user_setup (jira_connection_id);

-- Per-SAI-site Jira project overrides (advanced mapping step).
-- Resolution logic: if a row exists for (user_id, sai_site_id), use that project;
-- otherwise fall back to jira_user_setup.default_project_key.
create table if not exists public.jira_site_project_mappings (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  jira_connection_id uuid not null references public.jira_connections(id) on delete cascade,
  sai_site_id text not null,
  sai_site_name text,
  -- Per-site Jira instance override (only relevant when the user has multiple Jira Cloud instances)
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

-- Jira webhook events: written by webhook handler, read by clients via Realtime for instant UI refresh.
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

-- Allow anonymous read for Realtime subscription (data is non-sensitive: issue/project keys and event type).
alter table public.jira_webhook_events enable row level security;

create policy "Allow read for sync"
  on public.jira_webhook_events for select
  using (true);

-- Enable Realtime so INSERT events are broadcast to subscribed clients.
alter publication supabase_realtime add table public.jira_webhook_events;

