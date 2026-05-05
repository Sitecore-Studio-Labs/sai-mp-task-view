-- Row-level security: blocks postgres access using the anon/authenticated keys.
-- API routes use SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS (Supabase default).
-- No policies are defined for anon/authenticated on these tables → unauthenticated direct DB access is denied.
alter table public.jira_connections enable row level security;
alter table public.jira_sessions enable row level security;
alter table public.sync_logs enable row level security;
