import type { PagesContextSiteInfo } from "@sitecore-marketplace-sdk/client";

export interface PagesContextPageInfo {
  name?: string;
  id?: string;
  displayName?: string;
  path?: string;
  route?: string;
  language?: string;
  version?: number;
  layoutEditingKind?: string;
  [key: string]: unknown;
}

export interface PageContextData {
  siteInfo: PagesContextSiteInfo | null;
  pageInfo: PagesContextPageInfo | null;
  environment: string | null;
  isLoading: boolean;
  error: Error | null;
}
