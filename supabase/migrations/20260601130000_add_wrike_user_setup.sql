-- Wrike setup wizard state (folder selection + completion gate).
create table if not exists public.wrike_user_setup (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  wrike_connection_id uuid not null references public.wrike_connections (id) on delete cascade,
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

comment on column public.wrike_user_setup.default_project_key is
  'Selected Wrike folder id used as the task-list scope.';
