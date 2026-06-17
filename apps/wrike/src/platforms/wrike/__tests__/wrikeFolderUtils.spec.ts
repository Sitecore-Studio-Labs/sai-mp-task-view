import { describe, expect, it } from "vitest";

import { resolveWorkflowFolderIds } from "@/platforms/wrike/wrikeEnrichment";
import {
  filterPhysicalFolderIds,
  isWrikeLogicalFolderId,
} from "@/platforms/wrike/wrikeFolderUtils";
import type { WrikeHttpAdapter } from "@/platforms/wrike/WrikeHttpAdapter";
import type { WrikeTask } from "@/types/wrike";

describe("wrikeFolderUtils", () => {
  it("detects Wrike logical folder ids", () => {
    expect(isWrikeLogicalFolderId("IEAG2KZRI7777777")).toBe(true);
    expect(isWrikeLogicalFolderId("MQAAAAEJMtN_")).toBe(false);
  });

  it("filters logical folders from parentIds", () => {
    expect(filterPhysicalFolderIds(["MQAAAAEJMtN_", "IEAG2KZRI7777777"])).toEqual(["MQAAAAEJMtN_"]);
  });
});

describe("resolveWorkflowFolderIds", () => {
  it("walks superTaskIds when parentIds only contain logical folders", async () => {
    const subtask: WrikeTask = {
      id: "sub-1",
      parentIds: ["IEAG2KZRI7777777"],
      superTaskIds: ["parent-1"],
    };
    const parentTask: WrikeTask = {
      id: "parent-1",
      parentIds: ["MQAAAAEJMtN_"],
    };

    const adapter = {
      getTasksByIds: async (_token: unknown, ids: string[]) =>
        ids.map((id) => (id === "parent-1" ? parentTask : subtask)),
    } as unknown as WrikeHttpAdapter;

    await expect(resolveWorkflowFolderIds(adapter, {} as never, subtask)).resolves.toEqual([
      "MQAAAAEJMtN_",
    ]);
  });
});
