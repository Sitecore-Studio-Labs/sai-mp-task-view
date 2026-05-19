-- jira_site and jira_project are no longer populated during the OAuth callback;
-- the setup wizard (jira_user_setup) now owns site/project selection.
-- Drop the NOT NULL constraints so connections can be created before setup completes.
ALTER TABLE public.jira_connections ALTER COLUMN jira_site DROP NOT NULL;
ALTER TABLE public.jira_connections ALTER COLUMN jira_project DROP NOT NULL;
