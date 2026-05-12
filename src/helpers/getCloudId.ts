import { type NextRequest } from "next/server";

/**
 * Resolves the Jira cloud ID (site) for an incoming API request.
 *
 * Priority order:
 *  1. `cloudId` query parameter — allows explicit overrides (e.g. settings panel loading a
 *     different site's projects).
 *  2. `X-Jira-Cloud-Id` request header — set automatically by the axios client in
 *     TaskManagerProvider via setCurrentCloudId whenever effectiveSelectedSiteId changes.
 *  3. undefined — createJiraAdapterForUser falls back to jira_user_setup.jira_site_id.
 */
export const getCloudIdFromRequest = (request: NextRequest): string | undefined =>
  request.nextUrl.searchParams.get("cloudId") ??
  request.headers.get("x-jira-cloud-id") ??
  undefined;
