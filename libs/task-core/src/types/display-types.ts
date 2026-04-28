/**
 * Generic display types used by platform-agnostic UI components.
 * Platform-specific types (e.g. JiraPriority, JiraUser) are structurally
 * compatible with these interfaces — no explicit casting required.
 */

export interface PlatformPriority {
  id?: string;
  name?: string;
  iconUrl?: string;
}

export interface PlatformStatusCategory {
  key: string;
  name?: string;
  colorName?: string;
}

export interface PlatformStatus {
  id?: string;
  name?: string;
  statusCategory: PlatformStatusCategory;
}

export interface PlatformUser {
  accountId?: string;
  displayName?: string;
  avatarUrls?: Record<string, string>;
}
