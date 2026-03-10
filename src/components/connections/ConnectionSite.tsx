"use client";
import { useTaskManager } from "@/providers/task-manager/TaskManagerProvider";
import { SelectReact, SelectReactOption } from "../ui/select-react";
import { useJiraConnectionStatus } from "@/hooks/useJiraConnectionStatus";
import { useJiraSelectSite } from "@/hooks/useJiraSelectSite";
import { useCallback, useEffect } from "react";

export default function ConnectionSite() {
  const { data: status } = useJiraConnectionStatus();
  const connected = status?.connected ?? false;
  const { sites, selectedSiteId, setSelectedSiteId, sitesLoading } =
    useTaskManager();
  const { mutate: selectSite } = useJiraSelectSite();

  const onChange = useCallback(
    (option: SelectReactOption | null) => {
      const value = option?.value ?? null;

      if (connected && value && value !== selectedSiteId) {
        selectSite(
          { cloudId: value },
          {
            onSuccess: () => {
              setSelectedSiteId(value);
            },
          },
        );
      }
    },
    [connected, selectSite, setSelectedSiteId, selectedSiteId],
  );

  useEffect(() => {
    if (connected && sites.length === 1 && !selectedSiteId) {
      onChange({
        value: sites[0].id,
        label: `${sites[0].name} (${sites[0].url})`,
      });
    }
  }, [sites, onChange, selectedSiteId, connected]);

  const options: SelectReactOption[] = sites.map((site) => ({
    value: site.id,
    label: `${site.name} (${site.url})`,
  }));
  const selectedOption =
    options.find((site) => site.value === selectedSiteId) ?? null;

  if (!connected) return null;
  if (sites.length === 1) {
    return null;
  }
  return (
    <div className="wrapper w-full gap-3 py-3">
      <span className="text-sm font-medium text-neutral-fg block mb-2">
        Sites
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
