import { mdiCubeOutline, mdiEarth, mdiFolderOutline } from "@mdi/js";
import type { PlatformProject, PlatformProjectKind } from "@mp/task-core";

import type { SelectReactOption } from "../ui/select-react";

const PROJECT_KIND_ICON: Record<PlatformProjectKind, string> = {
  space: mdiEarth,
  folder: mdiFolderOutline,
  project: mdiCubeOutline,
};

export function getProjectKindIcon(kind: PlatformProjectKind): string {
  return PROJECT_KIND_ICON[kind];
}

const INDENT_PX = 16;

export const toSiteSelectOptions = (sites: { id: string; name: string }[]): SelectReactOption[] =>
  sites.length > 0 ? sites.map((site) => ({ value: site.id, label: site.name })) : [];

export const toProjectSelectOptions = (
  projects: Array<Pick<PlatformProject, "key" | "name"> & Partial<PlatformProject>>,
): SelectReactOption[] =>
  projects.length > 0
    ? projects.map((project) => ({
        value: project.key,
        label: project.name,
        iconPath: project.kind ? getProjectKindIcon(project.kind) : undefined,
        depth: project.depth,
        indentPx: project.depth !== undefined ? project.depth * INDENT_PX : undefined,
      }))
    : [];

/** Maps scope picker options (with optional hierarchy meta) to select options. */
export const scopeOptionsToSelectOptions = (
  options: Array<{ key: string; name: string; meta?: Record<string, unknown> }>,
): SelectReactOption[] =>
  toProjectSelectOptions(
    options.map((option) => ({
      id: option.key,
      key: option.key,
      name: option.name,
      kind: option.meta?.kind as PlatformProjectKind | undefined,
      depth: option.meta?.depth as number | undefined,
    })),
  );

export const toExternalResourceSelectOptions = (
  resources: Array<{ id: string; displayName?: string; name: string }>,
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
