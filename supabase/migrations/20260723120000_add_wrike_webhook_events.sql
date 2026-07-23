-- Wrike webhook events: written by the webhook handler, read via Supabase Realtime
-- for instant UI refresh without polling.

create table if not exists public.wrike_webhook_events (
  id uuid primary key default gen_random_uuid(),
  issue_key text not null,
  project_key text not null,
  event_type text not null,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_wrike_webhook_events_project_created
  on public.wrike_webhook_events (project_key, created_at desc);

alter table public.wrike_webhook_events enable row level security;

create policy "Allow read for sync"
  on public.wrike_webhook_events for select
  using (true);

alter publication supabase_realtime add table public.wrike_webhook_events;
