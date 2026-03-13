import { NextRequest, NextResponse } from "next/server";
import { getDraft, updateNodeInDraft } from "@/lib/workbreakdown-store";
import {
  flattenToCreationOrder,
  buildIssueTypeIdMap,
  mapWorkItemToJiraPayload,
} from "@/lib/workbreakdown-jira";
import {
  createJiraTaskForUser,
  getJiraIssueTypesForProject,
} from "@/services/jiraService";
import { JiraClientError } from "@/platforms/jira/JiraAdapter";
import type { PublishResult } from "@/types/workbreakdown-publish";
import { JiraAuthError } from "@/exceptions/jiraErrors";
import { clearJiraCookie } from "@/helpers/cookies";

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
  const userId = request.cookies.get("jira_user_id")?.value || "";
  let body: { projectId?: string };
  try {
    body = (await request.json()) as { projectId?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
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
    return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  }

  const result: PublishResult = {
    draftId,
    created: [],
    errors: [],
    status: "completed",
  };

  try {
    const issueTypes = await getJiraIssueTypesForProject(userId, projectId);
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
        const task = await createJiraTaskForUser(userId, payload);
        result.created.push({
          itemId: item.id,
          key: task.key,
          title: item.title,
        });
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
    if (err instanceof JiraAuthError) {
      await clearJiraCookie();
      return NextResponse.json({ error: err.message }, { status: 401 });
    }

    const Errmessage = err instanceof Error ? err.message : "";
    if (Errmessage === "No active Jira connection found for user.") {
      await clearJiraCookie();
      return NextResponse.json(
        { error: "No active Jira connection." },
        { status: 401 },
      );
    }

    const message = err instanceof Error ? err.message : "Publish failed.";
    console.error("Work breakdown publish error:", err);
    return NextResponse.json(
      { error: "Publish failed.", details: message },
      { status: 500 },
    );
  }

  return NextResponse.json(result);
}
