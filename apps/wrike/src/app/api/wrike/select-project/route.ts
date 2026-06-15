import { NextRequest, NextResponse } from "next/server";

// TODO: Persist the user's selected wrike project.
export async function POST(req: NextRequest) {
  const { projectKey } = (await req.json()) as { projectKey: string };
  void projectKey;
  return NextResponse.json({ ok: true });
}
