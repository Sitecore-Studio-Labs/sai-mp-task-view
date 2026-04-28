"use client";
import { SelectReact, SelectReactOption } from "@mp/ui";
import { useCallback, useEffect } from "react";

import { useJiraConnectionStatus } from "../../hooks/useJiraConnectionStatus";
import { useJiraSelectSite } from "../../hooks/useJiraSelectSite";
import { useTaskManager } from "../../providers/task-manager/TaskManagerProvider";

export default function ConnectionSite() {
  const { data: status } = useJiraConnectionStatus();
  const connected = status?.connected ?? false;
  const { sites, selectedSiteId, setSelectedSiteId, sitesLoading } = useTaskManager();
  const { mutate: selectSite } = useJiraSelectSite();

  const handleSiteSelect = useCallback(
    (cloudId: string) => {
      if (connected && cloudId !== selectedSiteId) {
        selectSite(
          { cloudId },
          {
            onSuccess: () => {
              setSelectedSiteId(cloudId);
            },
          },
        );
      }
    },
    [connected, selectSite, setSelectedSiteId, selectedSiteId],
  );

  const onChange = useCallback(
    (option: SelectReactOption | null) => {
      const value = option?.value;
      if (value) handleSiteSelect(value);
    },
    [handleSiteSelect],
  );

  useEffect(() => {
    if (connected && sites.length === 1 && !selectedSiteId) {
      handleSiteSelect(sites[0].id);
    }
  }, [sites, connected, selectedSiteId, handleSiteSelect]);

  const options: SelectReactOption[] = sites.map((site) => ({
    value: site.id,
    label: `${site.name} (${site.url})`,
  }));
  const selectedOption = options.find((site) => site.value === selectedSiteId) ?? null;

  if (!connected) return null;
  if (sites.length === 1) {
    return null;
  }
  return (
    <div className="wrapper w-full gap-3 py-3">
      <span className="text-neutral-fg mb-2 block text-sm font-medium">Jira Site</span>
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
