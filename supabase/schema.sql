-- Supabase schema for Jira integration
-- Run this in the Supabase SQL Editor (Dashboard → SQL Editor → New query) or via Supabase CLI.

create table if not exists public.jira_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  jira_site text not null,
  access_token_encrypted text not null,
  refresh_token_encrypted text not null,
  expiry timestamptz not null,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, jira_site)
);

create index if not exists idx_jira_connections_user_id
  on public.jira_connections (user_id);

create table if not exists public.sync_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  jira_connection_id uuid references public.jira_connections(id) on delete cascade,
  action text not null,
  details jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_sync_logs_user_id
  on public.sync_logs (user_id);

