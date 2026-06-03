-- Wrike core connection + session tables.
-- Must be applied before 20260601130000 (wrike_user_setup) and
-- 20260601140000 (wrike_site_project_mappings) which reference wrike_connections.

create table if not exists public.wrike_connections (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  -- Data-centre host returned in the OAuth token response (e.g. https://app-us2.wrike.com).
  -- Stored as wrike_site to match SupabaseTokenStore column convention.
  -- Defaults to empty string for connections created before the host was captured;
  -- repairWrikePlatformSite.ts backfills it on next token refresh.
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

create table if not exists public.wrike_sessions (
  id uuid primary key default gen_random_uuid(),
  session_token text unique not null,
  wrike_account_id text not null,
  created_at timestamp default now(),
  expires_at timestamp not null
);

create index if not exists idx_wrike_sessions_token
  on public.wrike_sessions (session_token);
