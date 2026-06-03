import type { WorkBreakdown } from "@mp/ai";
import { generateDraftId, setDraft, workBreakdownSchema } from "@mp/ai";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/workbreakdown
 * Body: work breakdown JSON (id optional; will be assigned if missing).
 * Returns: { draftId, workBreakdown }
 */
export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const draftId = generateDraftId();
  const now = new Date().toISOString();

  try {
    const parsed = workBreakdownSchema.safeParse({
      ...(typeof body === "object" && body !== null ? body : {}),
      id: (body as { id?: string })?.id ?? draftId,
      createdAt: (body as { createdAt?: string })?.createdAt ?? now,
      updatedAt: (body as { updatedAt?: string })?.updatedAt ?? now,
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation failed.", details: parsed.error.flatten() },
        { status: 422 },
      );
    }

    const workBreakdown: WorkBreakdown = parsed.data;
    setDraft(workBreakdown);

    return NextResponse.json({
      draftId: workBreakdown.id,
      workBreakdown,
    });
  } catch (error) {
    console.error("workbreakdown POST error:", error);
    return NextResponse.json({ error: "Failed to save work breakdown." }, { status: 500 });
  }
}
