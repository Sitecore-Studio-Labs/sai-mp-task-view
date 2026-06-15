import { AsyncLocalStorage } from "node:async_hooks";

import { PLATFORM_SITE_ID_HEADER } from "@mp/shared";
import type { NextRequest } from "next/server";

/**
 * Request-scoped Wrike site override.
 *
 * The UI sends the user's currently-selected site via the `PLATFORM_SITE_ID_HEADER`
 * header (or an explicit `?siteId=`/`?cloudId=` query param). `withAdapter` reads it
 * once per request and runs the handler inside this AsyncLocalStorage scope, so the
 * single adapter factory (`getWrikeApiContext`) can pick it up without every
 * route or service function having to thread a site argument.
 *
 * When no override is present the store is `undefined` and the adapter falls back to
 * the persisted connection site — keeping persistence as the default. Static
 * single-site platforms simply never send the header, so this is a no-op for them.
 */
const siteOverrideStore = new AsyncLocalStorage<string | undefined>();

/** Extracts a site override from the request: explicit query param wins over the header. */
export function getSiteOverrideFromRequest(request: NextRequest): string | undefined {
  return (
    request.nextUrl.searchParams.get("siteId")?.trim() ||
    request.nextUrl.searchParams.get("cloudId")?.trim() ||
    request.headers.get(PLATFORM_SITE_ID_HEADER)?.trim() ||
    undefined
  );
}

/** Runs `fn` with the given site override visible to `getSiteOverride()` downstream. */
export function runWithSiteOverride<T>(siteId: string | undefined, fn: () => T): T {
  return siteOverrideStore.run(siteId, fn);
}

/** Returns the site override for the current request, or `undefined` if none was set. */
export function getSiteOverride(): string | undefined {
  return siteOverrideStore.getStore();
}
