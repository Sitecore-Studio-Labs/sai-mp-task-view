import { NextRequest, NextResponse } from "next/server";
import { getDraft, updateNodeInDraft } from "@/lib/workbreakdown-store";
import {
  flattenToCreationOrder,
  buildIssueTypeIdMap,
  mapWorkItemToJiraPayload,
} from "@/lib/workbreakdown-jira";
import {
  createJiraTaskForUser,
  getJiraIssueTypesForUser,
} from "@/services/jiraService";
import { JiraClientError } from "@/platforms/jira/JiraAdapter";
import type { PublishResult } from "@/types/workbreakdown-publish";

const DEMO_USER_ID = "00000000-0000-0000-0000-000000000001";

/**
 * POST /api/workbreakdown/[draftId]/publish
 * Body: { projectId: string }
 * Creates Jira issues in order (parents first), returns created keys and errors.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const { draftId } = await params;
  if (!draftId) {
    return NextResponse.json(
      { error: "draftId is required." },
      { status: 400 },
    );
  }

  let body: { projectId?: string };
  try {
    body = (await request.json()) as { projectId?: string };
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const projectId = body.projectId;
  if (typeof projectId !== "string" || !projectId.trim()) {
    return NextResponse.json(
      { error: "Body must include projectId (string)." },
      { status: 400 },
    );
  }

  const draft = getDraft(draftId);
  if (!draft) {
    return NextResponse.json(
      { error: "Draft not found." },
      { status: 404 },
    );
  }

  const result: PublishResult = {
    draftId,
    created: [],
    errors: [],
    status: "completed",
  };

  try {
    const issueTypes = await getJiraIssueTypesForUser(DEMO_USER_ID, projectId);
    const issueTypeIdMap = buildIssueTypeIdMap(issueTypes);
    const ordered = flattenToCreationOrder(draft.items);
    const keyByItemId = new Map<string, string>();

    for (const item of ordered) {
      const parent = ordered.find((p) =>
        p.children.some((c) => c.id === item.id),
      );
      const parentKey = parent ? keyByItemId.get(parent.id) : undefined;

      const payload = mapWorkItemToJiraPayload(item, {
        projectId: projectId.trim(),
        parentKey,
        issueTypeIdByInternalType: issueTypeIdMap,
      });

      try {
        const task = await createJiraTaskForUser(DEMO_USER_ID, payload);
        result.created.push({ itemId: item.id, key: task.key, title: item.title });
        keyByItemId.set(item.id, task.key);
        updateNodeInDraft(draftId, item.id, { externalKey: task.key });
      } catch (err) {
        const message =
          err instanceof JiraClientError
            ? err.message
            : err instanceof Error
              ? err.message
              : "Failed to create issue.";
        result.errors.push({ itemId: item.id, title: item.title, message });
      }
    }

    if (result.errors.length > 0) {
      result.status = result.created.length > 0 ? "partial" : "failed";
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Publish failed.";
    console.error("Work breakdown publish error:", err);
    return NextResponse.json(
      { error: "Publish failed.", details: message },
      { status: 500 },
    );
  }

  return NextResponse.json(result);
}
