import { NextResponse } from "next/server";
import { getJiraIssuesForProject } from "@/services/jiraService";

export async function GET(request: Request) {
  const demoUserId = "00000000-0000-0000-0000-000000000001";

  const { searchParams } = new URL(request.url);
  const projectKey = searchParams.get("project");
  const cursor = searchParams.get("cursor") ?? undefined;

  if (!projectKey) {
    return NextResponse.json(
      { error: "project query parameter is required" },
      { status: 400 }
    );
  }

  try {
    const issues = await getJiraIssuesForProject(
      demoUserId,
      projectKey,
      cursor
    );

    return NextResponse.json(issues);
  } catch (error) {
    console.error("Failed to load Jira issues:", error);

    return NextResponse.json(
      { error: "Failed to load Jira issues." },
      { status: 500 }
    );
  }
}
