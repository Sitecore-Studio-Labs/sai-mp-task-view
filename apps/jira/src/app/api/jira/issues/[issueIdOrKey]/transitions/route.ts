import { NextRequest, NextResponse } from "next/server";

import { withAdapter } from "@/lib/platformRoute";
import { parseBody, transitionIssueSchema } from "@/lib/schemas/route-schemas";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueIdOrKey: string }> },
) {
  const { issueIdOrKey } = await params;
  return withAdapter(request, async (adapter) => {
    const transitions = await adapter.getTransitions(issueIdOrKey);
    return { transitions };
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ issueIdOrKey: string }> },
) {
  const { issueIdOrKey } = await params;

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = parseBody(transitionIssueSchema, raw);
  if (!parsed.ok) return parsed.response;

  return withAdapter(request, async (adapter) => {
    await adapter.changeStatus(issueIdOrKey, parsed.data.transitionId);
    return { success: true, message: "Issue status updated successfully" };
  });
}
