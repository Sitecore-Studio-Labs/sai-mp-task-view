import { decrypt } from "@/utils/encryption";
import { createSupabaseServerClient } from "@/lib/supabaseClient";
import { NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const userId = request.cookies.get("jira_user_id")?.value || "";

  const supabase = createSupabaseServerClient();

  const { data, error } = await supabase
    .from("jira_connections")
    .select("jira_site, access_token_encrypted")
    .eq("user_id", userId)
    .eq("status", "active")
    .single();

  if (error || !data)
    return new Response("Jira connection not found", { status: 404 });

  const token = { accessToken: decrypt(data.access_token_encrypted) };

  const resources = await getAccessibleResources(token.accessToken);

  return new Response(
    JSON.stringify({ resources, selectedSite: data.jira_site }),
    { status: 200 },
  );
}

async function getAccessibleResources(
  token: string,
): Promise<Array<{ id: string; name: string; url: string }>> {
  const res = await fetch(
    "https://api.atlassian.com/oauth/token/accessible-resources",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json",
      },
    },
  );
  if (!res.ok) {
    throw new Error(`Accessible resources failed: ${res.status}`);
  }
  const data = (await res.json()) as Array<{
    id: string;
    name: string;
    url: string;
  }>;
  return data;
}
