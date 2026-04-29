"use client";

import { usePlatformCapabilities, useTaskManager } from "@mp/task-core";
import { useCallback, useEffect } from "react";

import { usePlatformConnectionStatus } from "../../hooks/usePlatformConnectionStatus";
import { usePlatformSelectSite } from "../../hooks/usePlatformSelectSite";
import { SelectReact, type SelectReactOption } from "../ui/select-react";

/**
 * Platform-agnostic site picker. Renders a dropdown when the user is connected
 * and the platform exposes multiple sites. Auto-selects when exactly one site is available.
 * Reads the platform display name from PlatformCapabilitiesContext.
 */
export function ConnectionSite() {
  const { platformDisplayName } = usePlatformCapabilities();
  const { data: status } = usePlatformConnectionStatus();
  const connected = status?.connected ?? false;
  const { sites, selectedSiteId, setSelectedSiteId, sitesLoading } = useTaskManager();
  const { mutate: selectSite } = usePlatformSelectSite();

  const handleSiteSelect = useCallback(
    (siteId: string) => {
      if (connected && siteId !== selectedSiteId) {
        selectSite({ siteId }, { onSuccess: () => setSelectedSiteId(siteId) });
      }
    },
    [connected, selectSite, setSelectedSiteId, selectedSiteId],
  );

  const onChange = useCallback(
    (option: SelectReactOption | null) => {
      if (option?.value) handleSiteSelect(option.value);
    },
    [handleSiteSelect],
  );

  useEffect(() => {
    if (connected && sites.length === 1 && !selectedSiteId) {
      handleSiteSelect(sites[0].id);
    }
  }, [sites, connected, selectedSiteId, handleSiteSelect]);

  if (!connected || sites.length <= 1) return null;

  const options: SelectReactOption[] = sites.map((site) => ({
    value: site.id,
    label: `${site.name} (${site.url})`,
  }));
  const selectedOption = options.find((o) => o.value === selectedSiteId) ?? null;

  return (
    <div className="wrapper w-full gap-3 py-3">
      <span className="text-neutral-fg mb-2 block text-sm font-medium">
        {platformDisplayName} Site
      </span>
      <SelectReact
        options={options}
        placeholder="Select a site"
        aria-label="Select a site"
        value={selectedOption}
        onChange={onChange}
        isDisabled={sitesLoading}
      />
    </div>
  );
}
