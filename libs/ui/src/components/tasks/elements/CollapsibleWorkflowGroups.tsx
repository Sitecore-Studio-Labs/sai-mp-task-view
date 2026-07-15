"use client";

import { mdiChevronDown } from "@mdi/js";
import type { ReactNode } from "react";

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "../../ui/collapsible";
import { Icon } from "../../ui/icon";

export type CollapsibleWorkflowGroup<T> = {
  label: string;
  options: T[];
  collapsible?: boolean;
  defaultOpen?: boolean;
};

type CollapsibleWorkflowGroupsProps<T> = {
  groups: CollapsibleWorkflowGroup<T>[];
  renderOption: (option: T, index: number) => ReactNode;
  /** When true, every group is expanded (e.g. while filtering). */
  expandAll?: boolean;
};

export function CollapsibleWorkflowGroups<T>({
  groups,
  renderOption,
  expandAll = false,
}: CollapsibleWorkflowGroupsProps<T>) {
  return (
    <>
      {groups.map((group) => {
        const isCollapsible = group.collapsible && !expandAll;

        if (!isCollapsible) {
          return (
            <div key={group.label} role="group" aria-label={group.label}>
              <div className="text-muted-foreground px-3 py-1.5 text-xs font-semibold">
                {group.label}
              </div>
              {group.options.map((option, index) => renderOption(option, index))}
            </div>
          );
        }

        return (
          <Collapsible
            key={group.label}
            defaultOpen={group.defaultOpen ?? false}
            className="border-t first:border-t-0"
          >
            <CollapsibleTrigger
              className="text-muted-foreground flex w-full cursor-pointer items-center justify-between px-3 py-1.5 text-left text-xs font-semibold hover:bg-gray-50 [&[data-state=open]>svg]:rotate-180"
              onPointerDown={(event) => event.preventDefault()}
              onClick={(event) => event.stopPropagation()}
            >
              <span>{group.label}</span>
              <Icon path={mdiChevronDown} size="sm" colorScheme="inherit" className="shrink-0" />
            </CollapsibleTrigger>
            <CollapsibleContent>
              {group.options.map((option, index) => renderOption(option, index))}
            </CollapsibleContent>
          </Collapsible>
        );
      })}
    </>
  );
}
