import type { PlatformExternalResource, PlatformProject, PlatformSite } from "@mp/task-core";

import type { SelectReactOption } from "../ui/select-react";

export const toSiteSelectOptions = (sites: PlatformSite[]): SelectReactOption[] =>
  sites.length > 0 ? sites.map((site) => ({ value: site.id, label: site.name })) : [];

export const toProjectSelectOptions = (projects: PlatformProject[]): SelectReactOption[] =>
  projects.length > 0
    ? projects.map((project) => ({ value: project.key, label: project.name }))
    : [];

export const toExternalResourceSelectOptions = (
  resources: PlatformExternalResource[],
  disabledResourceIds?: Set<string>,
): SelectReactOption[] =>
  resources.length > 0
    ? resources.map((resource) => ({
        value: resource.id,
        label: resource.displayName ?? resource.name,
        disabled: disabledResourceIds?.has(resource.id) ?? false,
      }))
    : [];

export const getSelectedOption = (
  options: SelectReactOption[],
  value: string | null,
): SelectReactOption | null => options.find((option) => option.value === value) ?? null;
