-- Generalized setup scope selections (JSONB) for multi-platform setup wizard.
-- Jira continues dual-read/write with legacy jira_site_* / default_project_* columns.

alter table public.jira_user_setup
  add column if not exists scope_selections jsonb,
  add column if not exists task_list_scope_level_id text default 'project';

comment on column public.jira_user_setup.scope_selections is
  'Generalized scope picker state keyed by level id (e.g. site, project).';

comment on column public.jira_user_setup.task_list_scope_level_id is
  'Level id whose key gates the task list (e.g. project for Jira).';
