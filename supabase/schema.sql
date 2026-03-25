-- Supabase schema for Jira integration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query) or via Supabase CLI.

create table if not exists public.jira_connections (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  jira_site text not null,
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
-- After creating the table, add it to the Realtime publication so clients receive INSERT events:
--   Dashboard: Database → Publications → supabase_realtime → add table jira_webhook_events
--   Or run in SQL Editor: alter publication supabase_realtime add table public.jira_webhook_events;
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

