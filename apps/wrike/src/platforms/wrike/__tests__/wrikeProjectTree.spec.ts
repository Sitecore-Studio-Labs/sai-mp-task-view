import { describe, expect, it } from "vitest";

import {
  buildFolderToSpaceMap,
  buildHierarchicalWrikeProjects,
  getWrikeFolderKind,
  isWrikeExcludedFolder,
} from "@/platforms/wrike/wrikeProjectTree";
import type { WrikeFolder } from "@/types/wrike";

describe("wrikeProjectTree", () => {
  it("excludes account root, recycle bin, and logical folder ids", () => {
    expect(isWrikeExcludedFolder({ id: "IEAG2KZRI7777777", title: "Root" })).toBe(true);
    expect(isWrikeExcludedFolder({ id: "root", title: "Root", scope: "WsRoot" })).toBe(true);
    expect(isWrikeExcludedFolder({ id: "bin", title: "Recycle Bin", scope: "RbRoot" })).toBe(true);
    expect(isWrikeExcludedFolder({ id: "deleted", title: "Old", scope: "RbFolder" })).toBe(true);
    expect(isWrikeExcludedFolder({ id: "MQAAAAEJMtN_", title: "Marketing" })).toBe(false);
  });

  it("classifies spaces, projects, and folders", () => {
    expect(getWrikeFolderKind({ id: "s1", space: true })).toBe("space");
    expect(getWrikeFolderKind({ id: "p1", project: { ownerIds: [] } })).toBe("project");
    expect(getWrikeFolderKind({ id: "f1" })).toBe("folder");
  });

  it("orders folders depth-first with indentation metadata", () => {
    const folders: WrikeFolder[] = [
      { id: "root", title: "Account", scope: "WsRoot", childIds: ["space-a", "space-b"] },
      { id: "space-b", title: "Beta Space", space: true, childIds: ["folder-b1"] },
      { id: "folder-b1", title: "Beta Folder", childIds: ["project-b1"] },
      { id: "project-b1", title: "Beta Project", project: true },
      { id: "space-a", title: "Alpha Space", space: true, childIds: ["folder-a1"] },
      { id: "folder-a1", title: "Alpha Folder" },
    ];

    const result = buildHierarchicalWrikeProjects(folders, (folder, extras) => ({
      id: folder.id,
      key: folder.id,
      name: folder.title ?? folder.id,
      ...extras,
    }));

    expect(result.map((item) => item.name)).toEqual([
      "Alpha Space",
      "Alpha Folder",
      "Beta Space",
      "Beta Folder",
      "Beta Project",
    ]);
    expect(result.map((item) => item.depth)).toEqual([0, 1, 0, 1, 2]);
    expect(result.map((item) => item.kind)).toEqual([
      "space",
      "folder",
      "space",
      "folder",
      "project",
    ]);
  });

  it("maps nested folders and projects to their containing space", () => {
    const folders: WrikeFolder[] = [
      { id: "space-a", title: "Alpha Space", space: true, childIds: ["folder-a1"] },
      { id: "folder-a1", title: "Alpha Folder", childIds: ["project-a1"] },
      { id: "project-a1", title: "Alpha Project", project: true },
      { id: "space-b", title: "Beta Space", space: true },
    ];

    const folderToSpace = buildFolderToSpaceMap(folders);

    expect(folderToSpace.get("space-a")).toBe("space-a");
    expect(folderToSpace.get("space-b")).toBe("space-b");
    expect(folderToSpace.get("folder-a1")).toBe("space-a");
    expect(folderToSpace.get("project-a1")).toBe("space-a");
  });
});
