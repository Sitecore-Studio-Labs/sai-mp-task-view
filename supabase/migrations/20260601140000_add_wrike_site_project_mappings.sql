-- Per-Sitecore-site Wrike folder overrides (context-aware task list scope).
create table if not exists public.wrike_site_project_mappings (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  wrike_connection_id uuid not null references public.wrike_connections (id) on delete cascade,
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
