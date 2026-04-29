export interface JiraUserSetup {
  id: string;
  user_id: string;
  jira_connection_id: string;
  jira_site_id: string;
  jira_site_url: string;
  jira_site_name: string | null;
  default_project_id: string;
  default_project_key: string;
  default_project_name: string | null;
  setup_completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface JiraSiteProjectMapping {
  id: string;
  user_id: string;
  jira_connection_id: string;
  sai_site_id: string;
  sai_site_name: string | null;
  jira_site_id: string | null;
  jira_site_url: string | null;
  jira_site_name: string | null;
  jira_project_id: string;
  jira_project_key: string;
  jira_project_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface SetupResponse {
  connected: boolean;
  setup: JiraUserSetup | null;
  mappings: JiraSiteProjectMapping[];
}

export interface UpsertSetupPayload {
  jiraSiteId: string;
  jiraSiteUrl: string;
  jiraSiteName?: string;
  defaultProjectId: string;
  defaultProjectKey: string;
  defaultProjectName?: string;
}

export interface UpsertMappingItem {
  saiSiteId: string;
  saiSiteName?: string;
  jiraSiteId?: string;
  jiraSiteUrl?: string;
  jiraSiteName?: string;
  jiraProjectId: string;
  jiraProjectKey: string;
  jiraProjectName?: string;
}

export interface UpsertMappingsPayload {
  mappings: UpsertMappingItem[];
}
