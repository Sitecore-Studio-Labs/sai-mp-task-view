import { addChildInDraft, deleteNodeInDraft, getDraft, updateNodeInDraft } from "@mp/ai";
import { NextRequest, NextResponse } from "next/server";

import { parseBody, patchWorkbreakdownSchema } from "@/lib/schemas/route-schemas";

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

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseBody(patchWorkbreakdownSchema, raw);
  if (!parsed.ok) return parsed.response;

  const draft = getDraft(draftId);
  if (!draft) {
    return NextResponse.json({ error: "Draft not found." }, { status: 404 });
  }

  const body = parsed.data;

  if (body.op === "updateNode") {
    const updated = updateNodeInDraft(draftId, body.itemId, body.payload);
    if (!updated) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }
    return NextResponse.json(updated);
  }

  if (body.op === "deleteNode") {
    const updated = deleteNodeInDraft(draftId, body.itemId);
    if (!updated) {
      return NextResponse.json({ error: "Item not found." }, { status: 404 });
    }
    return NextResponse.json(updated);
  }

  // op === "addChild"
  const updated = addChildInDraft(draftId, body.parentId, {
    type: body.item.type,
    title: body.item.title ?? "Untitled",
    description: body.item.description ?? "",
    metadata: body.item.metadata,
  });
  if (!updated) {
    return NextResponse.json({ error: "Draft or parent not found." }, { status: 404 });
  }
  return NextResponse.json(updated);
}
