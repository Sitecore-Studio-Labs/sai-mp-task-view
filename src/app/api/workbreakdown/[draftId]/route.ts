import { NextRequest, NextResponse } from "next/server";

import {
  addChildInDraft,
  deleteNodeInDraft,
  getDraft,
  updateNodeInDraft,
} from "@/lib/workbreakdown-store";
import type { WorkItemType } from "@/types/workbreakdown";

/**
 * GET /api/workbreakdown/[draftId]
 * Returns the work breakdown draft or 404.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const { draftId } = await params;
  if (!draftId) {
    return NextResponse.json({ error: "draftId is required." }, { status: 400 });
  }

  const draft = getDraft(draftId);
  if (!draft) {
    return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  }

  return NextResponse.json(draft);
}

/** PATCH body: updateNode | deleteNode | addChild */
type PatchBody =
  | {
      op: "updateNode";
      itemId: string;
      payload: Partial<{
        title: string;
        description: string;
        type: WorkItemType;
        metadata: Record<string, unknown>;
      }>;
    }
  | { op: "deleteNode"; itemId: string }
  | {
      op: "addChild";
      parentId: string | null;
      item: {
        type: WorkItemType;
        title?: string;
        description?: string;
        metadata?: Record<string, unknown>;
      };
    };

/**
 * PATCH /api/workbreakdown/[draftId]
 * Partial update: updateNode, deleteNode, or addChild.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const { draftId } = await params;
  if (!draftId) {
    return NextResponse.json({ error: "draftId is required." }, { status: 400 });
  }

  let body: PatchBody;
  try {
    body = (await request.json()) as PatchBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const draft = getDraft(draftId);
  if (!draft) {
    return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  }

  if (body.op === "updateNode") {
    if (!body.itemId || typeof body.itemId !== "string") {
      return NextResponse.json({ error: "updateNode requires itemId (string)." }, { status: 400 });
    }
    const updated = updateNodeInDraft(draftId, body.itemId, body.payload);
    if (!updated) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }
    return NextResponse.json(updated);
  }

  if (body.op === "deleteNode") {
    if (!body.itemId || typeof body.itemId !== "string") {
      return NextResponse.json({ error: "deleteNode requires itemId (string)." }, { status: 400 });
    }
    const updated = deleteNodeInDraft(draftId, body.itemId);
    if (!updated) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }
    return NextResponse.json(updated);
  }

  if (body.op === "addChild") {
    const parentId = body.parentId ?? null;
    const item = body.item;
    if (!item || typeof item.type !== "string") {
      return NextResponse.json(
        { error: "addChild requires item with type (epic|story|task|subtask)." },
        { status: 400 },
      );
    }
    const updated = addChildInDraft(draftId, parentId, {
      type: item.type,
      title: item.title ?? "Untitled",
      description: item.description ?? "",
      metadata: item.metadata,
    });
    if (!updated) {
      return NextResponse.json({ error: "Draft or parent not found." }, { status: 404 });
    }
    return NextResponse.json(updated);
  }

  return NextResponse.json(
    { error: "Invalid op. Use updateNode, deleteNode, or addChild." },
    { status: 400 },
  );
}
