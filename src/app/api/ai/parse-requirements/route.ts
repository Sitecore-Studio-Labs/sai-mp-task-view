import { NextRequest, NextResponse } from "next/server";
import type { ParseRequirementsBody, ParseRequirementsResponse } from "@/types/workbreakdown";
import { parseAiWorkBreakdown } from "@/lib/ai-parse-requirements";
import { stubParseRequirements } from "@/lib/ai-stub";
import { setDraft } from "@/lib/workbreakdown-store";
import { generateDraftId } from "@/lib/workbreakdown-store";

/**
 * POST /api/ai/parse-requirements
 * Body: { requirementText: string, projectKey?: string, platform?: string }
 * Returns: { draftId, workBreakdown }
 */
export async function POST(request: NextRequest) {
  let body: ParseRequirementsBody;
  try {
    body = (await request.json()) as ParseRequirementsBody;
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const { requirementText, projectKey, platform } = body;
  if (!requirementText || typeof requirementText !== "string") {
    return NextResponse.json(
      { error: "requirementText is required and must be a string." },
      { status: 400 },
    );
  }

  const draftId = generateDraftId();

  try {
    // Stub: use mock response. Replace with real AI call and pass rawResponse to parseAiWorkBreakdown.
    const stubJson = stubParseRequirements(requirementText);
    const rawResponse = JSON.stringify(stubJson);
    const workBreakdown = parseAiWorkBreakdown(
      rawResponse,
      draftId,
      projectKey,
      platform,
    );

    setDraft(workBreakdown);

    const response: ParseRequirementsResponse = {
      draftId,
      workBreakdown,
    };
    return NextResponse.json(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Parse failed.";
    console.error("parse-requirements error:", error);
    return NextResponse.json(
      { error: "Failed to parse requirements.", details: message },
      { status: 422 },
    );
  }
}
