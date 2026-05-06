-- Row-level security: blocks postgres access using the anon/authenticated keys.
-- API routes use SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS (Supabase default).
-- No policies are defined for anon/authenticated on these tables → unauthenticated direct DB access is denied.
alter table public.jira_connections enable row level security;
alter table public.jira_sessions enable row level security;
alter table public.sync_logs enable row level security;

revoke all on table public.jira_connections from anon;
revoke all on table public.jira_connections from authenticated;
revoke all on table public.jira_sessions from anon;
revoke all on table public.jira_sessions from authenticated;

-- Confirms that RLS is enabled correctly
select
  n.nspname as schema_name,
  c.relname as table_name,
  c.relrowsecurity as rls_enabled
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('jira_connections', 'jira_sessions', 'sync_logs')
order by c.relname;

-- Confirms that anon/authenticated have no direct grants on token/session tables
select
  grantee,
  table_name,
  privilege_type
from information_schema.role_table_grants
where table_schema = 'public'
  and table_name in ('jira_connections', 'jira_sessions')
  and grantee in ('anon', 'authenticated')
order by table_name, grantee, privilege_type;

-- Confirms that no permissive policies accidentally exist on token/session tables
select schemaname, tablename, policyname, cmd
from pg_policies
where schemaname = 'public'
  and tablename in ('jira_connections', 'jira_sessions')
order by tablename, policyname;