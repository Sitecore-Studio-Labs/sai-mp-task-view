"use client";

import { mdiCheck, mdiCrownOutline, mdiPencilOutline } from "@mdi/js";
import type { PlatformScopeSelection } from "@mp/task-core";
import { clearDescendantScopeSelections, usePlatformCapabilities } from "@mp/task-core";

import { usePlatformScopeOptions } from "../../hooks/usePlatformScopeOptions";
import { Button } from "../ui/button";
import { Icon } from "../ui/icon";
import { SelectReact } from "../ui/select-react";
import { getSelectedOption, scopeOptionsToSelectOptions } from "./selectOptions";

export type PlatformSetupScopePickerProps = {
  selections: Record<string, PlatformScopeSelection | null>;
  onSelectionChange: (levelId: string, selection: PlatformScopeSelection | null) => void;
  /** default: wizard/settings with optional read-only summary; inline: mapping rows (dropdowns only). */
  variant?: "default" | "inline";
  readOnly?: boolean;
  onToggleEdit?: () => void;
  labelClassName?: string;
  testIdPrefix?: string;
};

function ScopeLevelSelect({
  levelId,
  label,
  parentLevelId,
  selections,
  onSelectionChange,
  testId,
}: {
  levelId: string;
  label: string;
  parentLevelId?: string;
  selections: Record<string, PlatformScopeSelection | null>;
  onSelectionChange: (levelId: string, selection: PlatformScopeSelection | null) => void;
  testId: string;
}) {
  const { options, isLoading } = usePlatformScopeOptions(levelId, selections);
  const selected = selections[levelId];
  const selectOptions = scopeOptionsToSelectOptions(options);
  const selectedOption = getSelectedOption(selectOptions, selected?.key ?? null);
  const parentSelected = !parentLevelId || Boolean(selections[parentLevelId]?.id);

  return (
    <div data-testid={testId}>
      <SelectReact
        options={selectOptions}
        value={selectedOption}
        isLoading={isLoading}
        onChange={(option) => {
          if (!option) {
            onSelectionChange(levelId, null);
            return;
          }
          const match = options.find((item) => item.key === option.value) ?? null;
          onSelectionChange(levelId, match);
        }}
        placeholder={`Select ${label}`}
        aria-label={`Select ${label}`}
        isDisabled={!parentSelected || isLoading}
      />
    </div>
  );
}

export function PlatformSetupScopePicker({
  selections,
  onSelectionChange,
  variant = "default",
  readOnly = false,
  onToggleEdit,
  labelClassName = "text-muted-foreground text-xs font-bold tracking-wide uppercase",
  testIdPrefix = "scope-picker",
}: PlatformSetupScopePickerProps) {
  const { setupScope, platformDisplayName } = usePlatformCapabilities();

  if (!setupScope || setupScope.scopeLevels.length === 0) {
    return null;
  }

  const taskListLevel =
    setupScope.scopeLevels.find((level) => level.id === setupScope.taskListScopeLevelId) ??
    setupScope.scopeLevels[setupScope.scopeLevels.length - 1];
  const tenantLevel = setupScope.scopeLevels[0];

  const handleSelectionChange = (levelId: string, selection: PlatformScopeSelection | null) => {
    const nextSelections = clearDescendantScopeSelections(
      { ...selections, [levelId]: selection },
      levelId,
      setupScope,
    );

    for (const level of setupScope.scopeLevels) {
      if (nextSelections[level.id] !== selections[level.id]) {
        onSelectionChange(level.id, nextSelections[level.id] ?? null);
      }
    }
  };

  const taskListSelection = selections[taskListLevel.id];
  const tenantSelection = selections[tenantLevel.id];

  if (variant === "inline") {
    return (
      <div className="space-y-2">
        {setupScope.scopeLevels.map((level) => (
          <ScopeLevelSelect
            key={level.id}
            levelId={level.id}
            label={level.label}
            parentLevelId={level.parentLevelId}
            selections={selections}
            onSelectionChange={handleSelectionChange}
            testId={`${testIdPrefix}-${level.id}`}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className={labelClassName}>Default {taskListLevel.label}</p>
        {onToggleEdit && (
          <Button
            type="button"
            variant="ghost"
            colorScheme="neutral"
            size="icon-sm"
            data-testid={`${testIdPrefix}-toggle-edit`}
            onClick={onToggleEdit}
            aria-label="Edit default scope selections"
          >
            <Icon
              path={readOnly ? mdiPencilOutline : mdiCheck}
              size={0.85}
              colorScheme="inherit"
              className="text-neutral-fg"
            />
          </Button>
        )}
      </div>

      {readOnly ? (
        <div className="rounded-md border bg-slate-50 px-3 py-2">
          <div className="flex items-center gap-3">
            <div className="shrink-0 rounded-sm border p-2">
              <Icon
                path={mdiCrownOutline}
                colorScheme="inherit"
                className="text-body-text size-6"
              />
            </div>
            <div className="min-w-0 text-left">
              <p data-testid={`${testIdPrefix}-${taskListLevel.id}`} className="font-bold">
                {taskListSelection?.name ?? "Not selected"}
              </p>
              {setupScope.scopeLevels.length > 1 && (
                <p
                  data-testid={`${testIdPrefix}-${tenantLevel.id}`}
                  className="text-muted-foreground text-sm"
                >
                  {tenantSelection?.name ?? "Not selected"}
                </p>
              )}
            </div>
          </div>
        </div>
      ) : (
        <>
          {setupScope.scopeLevels.map((level) => (
            <ScopeLevelSelect
              key={level.id}
              levelId={level.id}
              label={level.label}
              parentLevelId={level.parentLevelId}
              selections={selections}
              onSelectionChange={handleSelectionChange}
              testId={`${testIdPrefix}-${level.id}`}
            />
          ))}
          {setupScope.scopeLevels.length === 0 && (
            <p className="text-muted-foreground text-sm">
              No scope levels configured for {platformDisplayName}.
            </p>
          )}
        </>
      )}
    </div>
  );
}
