import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  const userId = request.cookies.get("jira_user_id")?.value || "";

  let cloudId: string;
  try {
    const body = await request.json();
    cloudId = body.cloudId;
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
    });
  }

  if (!userId || !cloudId) return new Response("Missing data", { status: 400 });

  const supabase = createSupabaseServerClient();

  const { error } = await supabase
    .from("jira_connections")
    .update({ jira_site: cloudId })
    .eq("user_id", userId)
    .eq("status", "active");

  if (error)
    return new Response(`Failed to update site: ${error.message}`, {
      status: 500,
    });

  return new Response(JSON.stringify({ success: true }), { status: 200 });
}
