import { useEffect } from "react";

type JiraSiteRef = { id: string };

/**
 * When only one Jira site is available, auto-select it so callers can hide the site picker.
 */
export function useAutoSelectSingleJiraSite(
  sites: JiraSiteRef[],
  selectedSiteId: string | null,
  onSiteSelect: (siteId: string) => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled || sites.length !== 1) return;
    const singleSiteId = sites[0]!.id;
    if (selectedSiteId !== singleSiteId) {
      onSiteSelect(singleSiteId);
    }
  }, [sites, selectedSiteId, onSiteSelect, enabled]);
}
