/**
 * Validates and normalises the Wrike data-centre host from the OAuth token response.
 * Prevents SSRF by restricting to *.wrike.com origins.
 * Review and update the allowlist below if your platform uses other domains.
 */
export function normalizeWrikeHost(host: string): string {
  const trimmed = host.trim();
  if (!trimmed) {
    throw new Error("Wrike token response is missing the host field.");
  }

  let url: URL;
  try {
    url = new URL(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
  } catch {
    throw new Error("Invalid Wrike host in token response.");
  }

  const hostname = url.hostname.toLowerCase();
  if (hostname !== "wrike.com" && !hostname.endsWith(".wrike.com")) {
    throw new Error("Wrike host is not on the allowlist.");
  }

  return url.origin;
}

export function isPlaceholderWrikeSite(site: string | null | undefined): boolean {
  if (!site) return true;
  const normalized = site.trim().toLowerCase();
  return (
    normalized.includes("todo_replace") ||
    normalized === "" ||
    normalized === "https://todo_replace_with_platform_site"
  );
}

export function isPlaceholderWrikeUserId(userId: string | null | undefined): boolean {
  if (!userId) return true;
  return userId.trim().toLowerCase().includes("todo_replace");
}

export const WRIKE_MISSING_HOST_MESSAGE =
  "Wrike connection is missing a data-centre host. Disconnect and reconnect to Wrike.";
