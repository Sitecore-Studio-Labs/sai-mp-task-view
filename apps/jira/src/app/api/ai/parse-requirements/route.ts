import type { ParseRequirementsResponse } from "@mp/ai";
import {
  generateDraftId,
  generateWorkBreakdownWithOpenAI,
  parseAiWorkBreakdown,
  setDraft,
  stubParseRequirements,
} from "@mp/ai";
import { NextRequest, NextResponse } from "next/server";

import { env } from "@/lib/config";
import { parseBody, parseRequirementsSchema } from "@/lib/schemas/route-schemas";

/**
 * POST /api/ai/parse-requirements
 * Body: { requirementText: string, projectKey?: string, platform?: string }
 * Returns: { draftId, workBreakdown }
 */
export async function POST(request: NextRequest) {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseBody(parseRequirementsSchema, raw);
  if (!parsed.ok) return parsed.response;

  const { requirementText, projectKey, platform } = parsed.data;
  const draftId = generateDraftId();

  try {
    let rawResponse: string;
    if (env.OPENAI_API_KEY?.trim()) {
      rawResponse = await generateWorkBreakdownWithOpenAI(requirementText);
    } else {
      const stubJson = stubParseRequirements(requirementText);
      rawResponse = JSON.stringify(stubJson);
    }
    const workBreakdown = parseAiWorkBreakdown(rawResponse, draftId, projectKey, platform);

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
