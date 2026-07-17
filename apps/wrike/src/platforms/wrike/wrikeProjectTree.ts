import type { PlatformProject, PlatformProjectKind } from "@mp/task-core";

import type { WrikeFolder, WrikeTreeScope } from "@/types/wrike";

import { isWrikeLogicalFolderId } from "./wrikeFolderUtils";

const EXCLUDED_SCOPES = new Set<WrikeTreeScope>(["WsRoot", "RbRoot", "RbFolder", "RbTask"]);

export function isWrikeExcludedFolder(folder: WrikeFolder): boolean {
  if (isWrikeLogicalFolderId(folder.id)) return true;
  if (folder.scope && EXCLUDED_SCOPES.has(folder.scope)) return true;
  return false;
}

export function getWrikeFolderKind(folder: WrikeFolder): PlatformProjectKind {
  if (folder.space) return "space";
  if (folder.project) return "project";
  return "folder";
}

/**
 * Maps every folder/project id to the space id it belongs to.
 * Built from a flat GET /folders response (needs `space` and `childIds`).
 */
export function buildFolderToSpaceMap(folders: WrikeFolder[]): Map<string, string> {
  const byId = new Map(folders.map((folder) => [folder.id, folder]));
  const parentByChild = new Map<string, string>();

  for (const folder of folders) {
    for (const childId of folder.childIds ?? []) {
      if (byId.has(childId)) {
        parentByChild.set(childId, folder.id);
      }
    }
  }

  const folderToSpace = new Map<string, string>();

  function resolveSpaceId(folderId: string, visiting = new Set<string>()): string | undefined {
    const cached = folderToSpace.get(folderId);
    if (cached) return cached;
    if (visiting.has(folderId)) return undefined;
    visiting.add(folderId);

    const folder = byId.get(folderId);
    if (!folder) return undefined;

    if (folder.space) {
      folderToSpace.set(folderId, folder.id);
      return folder.id;
    }

    const parentId = parentByChild.get(folderId);
    if (!parentId) return undefined;

    const spaceId = resolveSpaceId(parentId, visiting);
    if (spaceId) {
      folderToSpace.set(folderId, spaceId);
    }
    return spaceId;
  }

  for (const folder of folders) {
    resolveSpaceId(folder.id);
  }

  return folderToSpace;
}

function compareFoldersByTitle(a: WrikeFolder, b: WrikeFolder): number {
  return (a.title ?? a.id).localeCompare(b.title ?? b.id, undefined, { sensitivity: "base" });
}

/**
 * Filters account root / recycle bin entries and returns folders in tree order
 * with depth metadata for hierarchical dropdowns.
 */
export function buildHierarchicalWrikeProjects(
  folders: WrikeFolder[],
  normalize: (
    folder: WrikeFolder,
    extras: Pick<PlatformProject, "kind" | "depth" | "parentId">,
  ) => PlatformProject,
): PlatformProject[] {
  const visible = folders.filter((folder) => !isWrikeExcludedFolder(folder));
  const visibleIds = new Set(visible.map((folder) => folder.id));
  const byId = new Map(visible.map((folder) => [folder.id, folder]));

  const parentByChild = new Map<string, string>();
  for (const folder of visible) {
    for (const childId of folder.childIds ?? []) {
      if (visibleIds.has(childId)) {
        parentByChild.set(childId, folder.id);
      }
    }
  }

  const roots = visible
    .filter((folder) => {
      const parentId = parentByChild.get(folder.id);
      return !parentId || !visibleIds.has(parentId);
    })
    .sort(compareFoldersByTitle);

  const result: PlatformProject[] = [];
  const visited = new Set<string>();

  function walk(folder: WrikeFolder, depth: number, parentId?: string) {
    if (visited.has(folder.id)) return;
    visited.add(folder.id);

    result.push(
      normalize(folder, {
        kind: getWrikeFolderKind(folder),
        depth,
        parentId,
      }),
    );

    const children = (folder.childIds ?? [])
      .filter((childId) => visibleIds.has(childId) && !visited.has(childId))
      .map((childId) => byId.get(childId))
      .filter((child): child is WrikeFolder => child !== undefined)
      .sort(compareFoldersByTitle);

    for (const child of children) {
      walk(child, depth + 1, folder.id);
    }
  }

  for (const root of roots) {
    walk(root, 0);
  }

  for (const folder of visible) {
    if (!visited.has(folder.id)) {
      walk(folder, 0);
    }
  }

  return result;
}
