"use client";

import { mdiChevronDown, mdiDeleteOutline } from "@mdi/js";
import type { PlatformExternalResource, PlatformScopeSelection } from "@mp/task-core";
import {
  getTaskListScopeLevel,
  getTenantScopeLevels,
  mappingRequiresTenantSite,
  usePlatformCapabilities,
} from "@mp/task-core";
import { useMemo } from "react";

import { useAutoSelectSingleScope } from "../../hooks/useAutoSelectSingleScope";
import { usePlatformScopeOptions } from "../../hooks/usePlatformScopeOptions";
import { Button } from "../ui/button";
import { Icon } from "../ui/icon";
import { SelectReact } from "../ui/select-react";
import {
  getSelectedOption,
  toExternalResourceSelectOptions,
  toProjectSelectOptions,
} from "./selectOptions";

export type PlatformSetupDraftMapping = {
  id: string;
  externalResourceId: string;
  /** Platform tenant/site id when the hierarchy includes sites (Jira). */
  siteId: string;
  /** Task-list scope key (Jira project key, Wrike folder id, Monday board id). */
  projectKey: string;
  projectId: string;
  projectName?: string;
};

type PlatformSetupMappingCardProps = {
  mapping: PlatformSetupDraftMapping;
  externalResources: PlatformExternalResource[];
  isExternalResourcesLoading: boolean;
  mappedExternalResources: Set<string>;
  externalResourceLabel?: string;
  onChange: (
    mappingId: string,
    field: "externalResourceId" | "siteId" | "projectKey",
    value: string,
    project?: { id: string; name: string } | null,
  ) => void;
  onDelete: (mappingId: string) => void;
};

function MappingScopeLevelSelect({
  levelId,
  label,
  parentLevelId,
  selections,
  onSelect,
}: {
  levelId: string;
  label: string;
  parentLevelId?: string;
  selections: Record<string, PlatformScopeSelection | null>;
  onSelect: (key: string, project?: { id: string; name: string }) => void;
}) {
  const { options, isLoading } = usePlatformScopeOptions(levelId, selections);
  const selected = selections[levelId];
  const selectOptions = toProjectSelectOptions(
    options.map((option) => ({ id: option.id, key: option.key, name: option.name })),
  );
  const selectedOption = getSelectedOption(selectOptions, selected?.key ?? null);
  const parentSelected = !parentLevelId || Boolean(selections[parentLevelId]?.id);

  useAutoSelectSingleScope(
    options,
    selected?.key ?? null,
    (key) => {
      const match = options.find((item) => item.key === key);
      onSelect(key, match ? { id: match.id, name: match.name } : undefined);
    },
    parentSelected && !isLoading && !selected,
  );

  return (
    <SelectReact
      options={selectOptions}
      value={selectedOption}
      isLoading={isLoading}
      onChange={(option) => {
        if (!option) return;
        const match = options.find((item) => item.key === option.value);
        onSelect(option.value, match ? { id: match.id, name: match.name } : undefined);
      }}
      placeholder={`Select ${label}`}
      aria-label={label}
      isDisabled={!parentSelected || isLoading}
    />
  );
}

export function PlatformSetupMappingCard({
  mapping,
  externalResources,
  isExternalResourcesLoading,
  mappedExternalResources,
  externalResourceLabel = "Website",
  onChange,
  onDelete,
}: PlatformSetupMappingCardProps) {
  const { setupScope } = usePlatformCapabilities();

  // Memoize derived scope levels so the references are stable across renders.
  const taskListLevel = useMemo(
    () => (setupScope ? getTaskListScopeLevel(setupScope) : null),
    [setupScope],
  );
  const tenantLevels = useMemo(
    () => (setupScope ? getTenantScopeLevels(setupScope) : []),
    [setupScope],
  );

  // useMemo must be called unconditionally before any early return (Rules of Hooks).
  const scopeSelections = useMemo((): Record<string, PlatformScopeSelection | null> => {
    if (!taskListLevel) return {};
    const result: Record<string, PlatformScopeSelection | null> = {};
    for (const level of tenantLevels) {
      if (level.listSource === "sites" && mapping.siteId) {
        result[level.id] = {
          id: mapping.siteId,
          key: mapping.siteId,
          name: mapping.siteId,
        };
      } else {
        result[level.id] = null;
      }
    }
    if (mapping.projectKey) {
      result[taskListLevel.id] = {
        id: mapping.projectId || mapping.projectKey,
        key: mapping.projectKey,
        name: mapping.projectName ?? mapping.projectKey,
      };
    } else {
      result[taskListLevel.id] = null;
    }
    return result;
  }, [
    tenantLevels,
    taskListLevel,
    mapping.siteId,
    mapping.projectKey,
    mapping.projectId,
    mapping.projectName,
  ]);

  if (!setupScope || !taskListLevel) {
    return null;
  }

  const requiresSite = mappingRequiresTenantSite(setupScope);

  const externalResourceOptions = toExternalResourceSelectOptions(
    externalResources,
    mappedExternalResources,
  );
  const selectedExternalResource = getSelectedOption(
    externalResourceOptions,
    mapping.externalResourceId,
  );

  const handleScopeSelect = (
    levelId: string,
    key: string,
    project?: { id: string; name: string },
  ) => {
    if (levelId === taskListLevel.id) {
      onChange(mapping.id, "projectKey", key, project ?? null);
      return;
    }
    const level = tenantLevels.find((item) => item.id === levelId);
    if (level?.listSource === "sites") {
      onChange(mapping.id, "siteId", key);
    }
  };

  return (
    <div className="relative rounded-md border bg-slate-50 p-4" data-testid="mapping-box">
      <div className="flex flex-row-reverse items-center gap-2">
        <Button
          type="button"
          variant="ghost"
          colorScheme="neutral"
          size="icon-sm"
          data-testid="delete-mapping"
          onClick={() => onDelete(mapping.id)}
          aria-label="Delete mapping"
        >
          <Icon
            path={mdiDeleteOutline}
            size={0.85}
            colorScheme="inherit"
            className="text-body-text"
          />
        </Button>

        <div className="w-full" data-testid="mapping-external-resource">
          <SelectReact
            options={externalResourceOptions}
            value={selectedExternalResource}
            isLoading={isExternalResourcesLoading}
            onChange={(option) => {
              if (option) onChange(mapping.id, "externalResourceId", option.value);
            }}
            placeholder={`Select ${externalResourceLabel.toLowerCase()}`}
            aria-label={externalResourceLabel}
          />
        </div>
      </div>

      <Icon
        path={mdiChevronDown}
        colorScheme="inherit"
        className="text-muted-foreground mx-auto my-2 block size-6"
      />

      {tenantLevels.map((level) => (
        <div key={level.id} className="mb-2" data-testid={`mapping-${level.id}`}>
          <MappingScopeLevelSelect
            levelId={level.id}
            label={level.label}
            parentLevelId={level.parentLevelId}
            selections={scopeSelections}
            onSelect={(key, project) => handleScopeSelect(level.id, key, project)}
          />
        </div>
      ))}

      <div data-testid="mapping-task-list-scope">
        <MappingScopeLevelSelect
          levelId={taskListLevel.id}
          label={taskListLevel.label}
          parentLevelId={taskListLevel.parentLevelId}
          selections={scopeSelections}
          onSelect={(key, project) => handleScopeSelect(taskListLevel.id, key, project)}
        />
      </div>

      {requiresSite && !mapping.siteId && mapping.projectKey ? (
        <p className="text-muted-foreground mt-1 text-xs">
          Select a {tenantLevels.find((l) => l.listSource === "sites")?.label ?? "site"} when
          required.
        </p>
      ) : null}
    </div>
  );
}
