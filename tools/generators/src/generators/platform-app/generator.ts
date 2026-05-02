import type { Tree } from "@nx/devkit";
import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  names,
  offsetFromRoot,
} from "@nx/devkit";
import * as fs from "fs";
import * as yaml from "js-yaml";
import * as path from "path";

import type { PlatformAppGeneratorSchema } from "./schema";

// ── Types ────────────────────────────────────────────────────────────────────

interface AuthBlock {
  type: "oauth2-refresh" | "oauth2-static" | "oauth1" | "api-key";
  oauth2?: {
    authorizeUrl: string;
    tokenUrl: string;
    scopes?: string[];
    rotatingRefreshToken?: boolean;
    extraParams?: Record<string, string>;
    tokenEndpointAuthMethod?: "client_secret_post" | "client_secret_basic";
  };
  oauth1?: {
    requestTokenUrl: string;
    authorizeUrl: string;
    accessTokenUrl: string;
    signatureMethod: string;
  };
}

interface CapabilityMatrix {
  extends?: string;
  platform: {
    name: string;
    displayName: string;
    connectionTitle?: string;
    connectionDescription?: string;
  };
  capabilities: {
    hasIssueTypes?: boolean;
    hasPriorities?: boolean;
    hasAssignees?: boolean;
    hasDueDate?: boolean;
    hasParentIssue?: boolean;
    hasAttachments?: boolean;
    hasComments?: boolean;
    hasSubtasks?: boolean;
    hasStatusTransitions?: boolean;
    hasAiWorkBreakdown?: boolean;
    richTextFormat?: "adf" | "markdown" | "plain";
    hasSites?: boolean;
  };
  auth?: AuthBlock;
}

interface ValidationError {
  path: string;
  message: string;
}

// ── YAML validation ───────────────────────────────────────────────────────────

function validateCapabilityMatrix(raw: unknown): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    errors.push({ path: "(root)", message: "YAML must be a mapping object" });
    return errors;
  }

  const obj = raw as Record<string, unknown>;

  // platform section
  if (!obj["platform"] || typeof obj["platform"] !== "object" || Array.isArray(obj["platform"])) {
    errors.push({ path: "platform", message: "Required mapping is missing" });
  } else {
    const p = obj["platform"] as Record<string, unknown>;
    if (!p["name"] || typeof p["name"] !== "string" || p["name"].trim() === "") {
      errors.push({ path: "platform.name", message: "Required non-empty string" });
    } else if (!/^[a-z][a-z0-9-]*$/.test(p["name"])) {
      errors.push({
        path: "platform.name",
        message: `Must be lowercase kebab-case (e.g. "jira", "my-platform"), got: "${p["name"]}"`,
      });
    }
    if (
      !p["displayName"] ||
      typeof p["displayName"] !== "string" ||
      p["displayName"].trim() === ""
    ) {
      errors.push({ path: "platform.displayName", message: "Required non-empty string" });
    }
    for (const key of ["connectionTitle", "connectionDescription"]) {
      if (key in p && typeof p[key] !== "string") {
        errors.push({ path: `platform.${key}`, message: "Must be a string if provided" });
      }
    }
  }

  // capabilities section
  if (
    !obj["capabilities"] ||
    typeof obj["capabilities"] !== "object" ||
    Array.isArray(obj["capabilities"])
  ) {
    errors.push({ path: "capabilities", message: "Required mapping is missing" });
  } else {
    const caps = obj["capabilities"] as Record<string, unknown>;
    const boolFlags = [
      "hasIssueTypes",
      "hasPriorities",
      "hasAssignees",
      "hasDueDate",
      "hasParentIssue",
      "hasAttachments",
      "hasComments",
      "hasSubtasks",
      "hasStatusTransitions",
      "hasAiWorkBreakdown",
      "hasSites",
    ] as const;

    for (const flag of boolFlags) {
      if (flag in caps && typeof caps[flag] !== "boolean") {
        errors.push({
          path: `capabilities.${flag}`,
          message: `Must be a boolean (true or false), got: ${JSON.stringify(caps[flag])}`,
        });
      }
    }

    if (
      "richTextFormat" in caps &&
      !["adf", "markdown", "plain"].includes(caps["richTextFormat"] as string)
    ) {
      errors.push({
        path: "capabilities.richTextFormat",
        message: `Must be one of "adf" | "markdown" | "plain", got: ${JSON.stringify(caps["richTextFormat"])}`,
      });
    }
  }

  // auth block (optional — validated when present)
  if (obj["auth"] != null) {
    const auth = obj["auth"] as Record<string, unknown>;
    const validAuthTypes = ["oauth2-refresh", "oauth2-static", "oauth1", "api-key"];
    const authType = auth["type"];

    if (!authType || !validAuthTypes.includes(authType as string)) {
      errors.push({
        path: "auth.type",
        message: `Required. Must be one of: ${validAuthTypes.join(" | ")}`,
      });
    } else if (authType === "oauth2-refresh" || authType === "oauth2-static") {
      const o2 = auth["oauth2"] as Record<string, unknown> | undefined;
      if (!o2 || typeof o2 !== "object") {
        errors.push({ path: "auth.oauth2", message: `Required when auth.type is "${authType}"` });
      } else {
        for (const key of ["authorizeUrl", "tokenUrl"]) {
          if (!o2[key] || typeof o2[key] !== "string") {
            errors.push({ path: `auth.oauth2.${key}`, message: "Required non-empty string" });
          }
        }
        if (!Array.isArray(o2["scopes"])) {
          errors.push({ path: "auth.oauth2.scopes", message: "Must be an array of strings" });
        }
      }
    } else if (authType === "oauth1") {
      const o1 = auth["oauth1"] as Record<string, unknown> | undefined;
      if (!o1 || typeof o1 !== "object") {
        errors.push({ path: "auth.oauth1", message: 'Required when auth.type is "oauth1"' });
      } else {
        for (const key of [
          "requestTokenUrl",
          "authorizeUrl",
          "accessTokenUrl",
          "signatureMethod",
        ]) {
          if (!o1[key] || typeof o1[key] !== "string") {
            errors.push({ path: `auth.oauth1.${key}`, message: "Required non-empty string" });
          }
        }
      }
    }
  }

  return errors;
}

// ── YAML inheritance resolution ───────────────────────────────────────────────

/**
 * Loads a YAML file, resolves `extends`, and returns a merged CapabilityMatrix.
 * The derived YAML's platform/capabilities fields win over the base.
 *
 * Extend key accepts paths relative to the workspace root OR a bare name that
 * resolves to `capabilities/<name>.yaml` (e.g. `extends: base`).
 */
function loadAndResolveMatrix(yamlPath: string, workspaceRoot: string): CapabilityMatrix {
  const rawYaml = fs.readFileSync(yamlPath, "utf-8");
  const raw = yaml.load(rawYaml) as CapabilityMatrix & { extends?: string };

  const errors = validateCapabilityMatrix(raw);
  if (errors.length > 0) {
    const lines = errors.map((e) => `  ${e.path}: ${e.message}`).join("\n");
    throw new Error(
      `YAML validation failed: ${path.relative(workspaceRoot, yamlPath)}\n\n${lines}\n`,
    );
  }

  if (!raw.extends) return raw;

  // Resolve base YAML path
  const baseName = raw.extends;
  const basePath = path.isAbsolute(baseName)
    ? baseName
    : /[/\\]/.test(baseName)
      ? path.resolve(workspaceRoot, baseName)
      : path.join(workspaceRoot, "capabilities", `${baseName}.yaml`);

  if (!fs.existsSync(basePath)) {
    throw new Error(
      `extends: "${baseName}" resolved to "${basePath}" but the file does not exist.`,
    );
  }

  const base = loadAndResolveMatrix(basePath, workspaceRoot);

  // Deep merge: base caps first, derived caps win; platform and auth are fully from derived
  return {
    platform: raw.platform,
    capabilities: { ...base.capabilities, ...raw.capabilities },
    // auth block is taken wholesale from derived; no sub-key merging
    auth: raw.auth ?? base.auth,
  };
}

// ── Diff reporter ─────────────────────────────────────────────────────────────

function printDiff(tree: Tree, projectRoot: string): void {
  const changes = tree.listChanges();

  const appChanges = changes.filter(
    (c) => c.path.startsWith(projectRoot + "/") || c.path === projectRoot,
  );

  if (appChanges.length === 0) {
    console.log("\n[dry-run] No changes detected.\n");
    return;
  }

  const created = appChanges.filter((c) => c.type === "CREATE");
  const updated = appChanges.filter((c) => c.type === "UPDATE");
  const deleted = appChanges.filter((c) => c.type === "DELETE");

  const symbol = { CREATE: "+", UPDATE: "~", DELETE: "-" } as const;
  const label = { CREATE: "create", UPDATE: "update", DELETE: "delete" } as const;

  console.log(`\n[dry-run] Changes that would be made:\n`);

  for (const change of [...created, ...updated, ...deleted]) {
    const s = symbol[change.type];
    const l = label[change.type];
    console.log(`  ${s} ${l.padEnd(7)}  ${change.path}`);
  }

  const parts: string[] = [];
  if (created.length) parts.push(`${created.length} to create`);
  if (updated.length) parts.push(`${updated.length} to update`);
  if (deleted.length) parts.push(`${deleted.length} to delete`);

  console.log(`\n  ${"─".repeat(60)}`);
  console.log(`  ${parts.join(" · ")}`);
  console.log(`\nRun without --dry-run to apply these changes.\n`);
}

// ── Capabilities provider (string-templated for update-mode regeneration) ────

function genCapabilitiesProvider(vars: {
  className: string;
  constantName: string;
  platform: string;
  platformDisplay: string;
  connectionTitle: string;
  connectionDescription: string;
  caps: CapabilityMatrix["capabilities"];
}): string {
  const { caps } = vars;
  return `"use client";

import type { PlatformCapabilities } from "@mp/task-core";
import { PlatformCapabilitiesProvider } from "@mp/task-core";
import type { ReactNode } from "react";

export const ${vars.constantName}_CAPABILITIES: PlatformCapabilities = {
  platformName: "${vars.platform}",
  platformDisplayName: "${vars.platformDisplay}",
  platformLogo: null,
  connectionTitle: "${vars.connectionTitle}",
  connectionDescription: "${vars.connectionDescription}",
  hasIssueTypes: ${caps.hasIssueTypes ?? false},
  hasPriorities: ${caps.hasPriorities ?? false},
  hasAssignees: ${caps.hasAssignees ?? false},
  hasDueDate: ${caps.hasDueDate ?? false},
  hasParentIssue: ${caps.hasParentIssue ?? false},
  hasAttachments: ${caps.hasAttachments ?? false},
  hasComments: ${caps.hasComments ?? false},
  hasSubtasks: ${caps.hasSubtasks ?? false},
  hasStatusTransitions: ${caps.hasStatusTransitions ?? false},
  hasAiWorkBreakdown: ${caps.hasAiWorkBreakdown ?? false},
  richTextFormat: "${caps.richTextFormat ?? "plain"}",
};

export function ${vars.className}PlatformCapabilitiesProvider({ children }: { children: ReactNode }) {
  return (
    <PlatformCapabilitiesProvider value={${vars.constantName}_CAPABILITIES}>
      {children}
    </PlatformCapabilitiesProvider>
  );
}
`;
}

// ── Main generator ────────────────────────────────────────────────────────────

export default async function generator(tree: Tree, options: PlatformAppGeneratorSchema) {
  const { name, yamlFile, dryRun = false, update = false, force = false } = options;
  const projectNames = names(name);
  const projectRoot = `apps/${projectNames.fileName}`;

  // ── Step 1: Resolve + validate YAML ────────────────────────────────────────
  const yamlPath = path.join(tree.root, yamlFile);
  if (!fs.existsSync(yamlPath)) {
    throw new Error(`Capability YAML not found: ${yamlPath}`);
  }

  const matrix = loadAndResolveMatrix(yamlPath, tree.root);
  const caps = matrix.capabilities;
  const platform = matrix.platform;
  const auth = matrix.auth;

  // ── Step 2: Detect existing app ────────────────────────────────────────────
  const appExists = tree.exists(projectRoot);
  if (appExists && !update && !force && !dryRun) {
    throw new Error(
      `App "${projectRoot}" already exists.\n\n` +
        `  --update  Add new route stubs + regenerate capabilities provider, preserve everything else.\n` +
        `  --force   Overwrite all scaffold files (⚠ destructive for manual edits).\n` +
        `  --dry-run Preview what would change without writing.\n`,
    );
  }

  // ── Step 3: Generate static scaffold files ──────────────────────────────────
  const normalizeStr = (s: string) => s.replace(/\s+/g, " ").trim();

  const templateVars = {
    name: projectNames.fileName,
    className: projectNames.className,
    constantName: projectNames.constantName,
    platform: platform.name,
    platformDisplay: platform.displayName,
    connectionTitle: normalizeStr(platform.connectionTitle ?? `Connect to ${platform.displayName}`),
    connectionDescription: normalizeStr(
      platform.connectionDescription ??
        `Link your ${platform.displayName} account to manage tasks.`,
    ),
    ...caps,
    offsetFromRoot: offsetFromRoot(projectRoot),
    tmpl: "",
  };

  const capabilitiesProviderPath = `${projectRoot}/src/providers/${projectNames.className}PlatformCapabilitiesProvider.tsx`;

  if (!appExists || force) {
    // First run or forced overwrite: generate everything from templates.
    generateFiles(tree, path.join(__dirname, "files"), projectRoot, templateVars);

    // Remove the OAuth auth-failure provider for platforms that don't use OAuth.
    if (!auth || auth.type === "api-key") {
      const authFailurePath = `${projectRoot}/src/providers/auth-providers/${projectNames.className}AuthFailureProvider.tsx`;
      if (tree.exists(authFailurePath)) tree.delete(authFailurePath);
    }
  } else {
    // Update mode: always regenerate the capabilities provider from YAML.
    // All other template files are preserved (developer may have edited them).
    tree.write(
      capabilitiesProviderPath,
      genCapabilitiesProvider({
        className: projectNames.className,
        constantName: projectNames.constantName,
        platform: platform.name,
        platformDisplay: platform.displayName,
        connectionTitle: templateVars.connectionTitle,
        connectionDescription: templateVars.connectionDescription,
        caps,
      }),
    );
    console.log(
      `[update] Regenerated ${capabilitiesProviderPath} from ${path.basename(yamlFile)}.`,
    );
  }

  // ── Step 4: Write conditional API route stubs ───────────────────────────────
  // writeRouteStub skips existing files — always safe to call, idempotent.
  const apiBase = `${projectRoot}/src/app/api`;
  const platformSlug = platform.name;

  // Generate authStrategy.ts — the single instantiation point for the auth strategy.
  if (auth) {
    writeRouteStub(
      tree,
      `${projectRoot}/src/lib/authStrategy.ts`,
      genAuthStrategyFile(platformSlug, auth),
    );
  }

  writeRouteStub(
    tree,
    `${apiBase}/auth/${platformSlug}/status/route.ts`,
    genAuthStatusRoute(platformSlug),
  );
  writeRouteStub(
    tree,
    `${apiBase}/auth/${platformSlug}/disconnect/route.ts`,
    genDisconnectRoute(platformSlug),
  );
  writeRouteStub(
    tree,
    `${apiBase}/auth/${platformSlug}/connect/route.ts`,
    genConnectRoute(platformSlug, auth),
  );

  // Callback route: all OAuth flows (not api-key).
  if (auth && auth.type !== "api-key") {
    writeRouteStub(
      tree,
      `${apiBase}/auth/${platformSlug}/callback/route.ts`,
      genOAuthCallbackRoute(platformSlug),
    );
  }

  // Refresh route: only oauth2-refresh (token expires and needs renewal).
  if (auth?.type === "oauth2-refresh") {
    writeRouteStub(
      tree,
      `${apiBase}/auth/${platformSlug}/refresh/route.ts`,
      genRefreshRoute(platformSlug),
    );
  }
  if (caps.hasSites) {
    writeRouteStub(tree, `${apiBase}/${platformSlug}/sites/route.ts`, genSitesRoute(platformSlug));
    writeRouteStub(
      tree,
      `${apiBase}/${platformSlug}/select-site/route.ts`,
      genSelectSiteRoute(platformSlug),
    );
  }

  writeRouteStub(
    tree,
    `${apiBase}/${platformSlug}/projects/route.ts`,
    genProjectsRoute(platformSlug),
  );
  writeRouteStub(
    tree,
    `${apiBase}/${platformSlug}/select-project/route.ts`,
    genSelectProjectRoute(platformSlug),
  );
  writeRouteStub(tree, `${apiBase}/${platformSlug}/issues/route.ts`, genIssuesRoute(platformSlug));
  writeRouteStub(
    tree,
    `${apiBase}/${platformSlug}/issues/[issueIdOrKey]/route.ts`,
    genIssueRoute(platformSlug),
  );

  if (caps.hasStatusTransitions) {
    writeRouteStub(
      tree,
      `${apiBase}/${platformSlug}/issues/[issueIdOrKey]/transitions/route.ts`,
      genTransitionsRoute(platformSlug),
    );
  }
  if (caps.hasIssueTypes) {
    writeRouteStub(
      tree,
      `${apiBase}/${platformSlug}/issue-types/route.ts`,
      genIssueTypesRoute(platformSlug),
    );
  }
  if (caps.hasPriorities) {
    writeRouteStub(
      tree,
      `${apiBase}/${platformSlug}/project-priorities/route.ts`,
      genPrioritiesRoute(platformSlug),
    );
  }
  if (caps.hasAssignees) {
    writeRouteStub(
      tree,
      `${apiBase}/${platformSlug}/assignees/route.ts`,
      genAssigneesRoute(platformSlug),
    );
    writeRouteStub(
      tree,
      `${apiBase}/${platformSlug}/current-user/route.ts`,
      genCurrentUserRoute(platformSlug),
    );
  }

  writeRouteStub(
    tree,
    `${apiBase}/${platformSlug}/statuses/[projectKey]/route.ts`,
    genStatusesRoute(platformSlug),
  );

  if (caps.hasComments) {
    writeRouteStub(
      tree,
      `${apiBase}/${platformSlug}/comments/route.ts`,
      genCommentsRoute(platformSlug),
    );
  }

  writeRouteStub(
    tree,
    `${apiBase}/${platformSlug}/permissions/route.ts`,
    genPermissionsRoute(platformSlug),
  );

  if (caps.hasAttachments) {
    writeRouteStub(
      tree,
      `${apiBase}/${platformSlug}/attachment/[attachmentId]/route.ts`,
      genAttachmentRoute(platformSlug),
    );
  }
  if (caps.hasAiWorkBreakdown) {
    writeRouteStub(
      tree,
      `${apiBase}/ai/parse-requirements/route.ts`,
      genParseRequirementsRoute(platformSlug),
    );
    writeRouteStub(tree, `${apiBase}/workbreakdown/route.ts`, genWorkbreakdownRoute(platformSlug));
    writeRouteStub(
      tree,
      `${apiBase}/workbreakdown/[draftId]/route.ts`,
      genWorkbreakdownDraftRoute(platformSlug),
    );
    writeRouteStub(
      tree,
      `${apiBase}/workbreakdown/[draftId]/publish/route.ts`,
      genWorkbreakdownPublishRoute(platformSlug),
    );
  }

  // ── Step 5: Register NX project (skipped when updating) ────────────────────
  if (!appExists || force) {
    addProjectConfiguration(tree, projectNames.fileName, {
      root: projectRoot,
      projectType: "application",
      sourceRoot: `${projectRoot}/src`,
      targets: {
        build: {
          executor: "@nx/next:build",
          outputs: ["{options.outputPath}"],
          options: { outputPath: `dist/apps/${projectNames.fileName}` },
        },
        serve: {
          executor: "@nx/next:server",
          options: {
            buildTarget: `${projectNames.fileName}:build`,
            dev: true,
            port: 3000,
          },
        },
        lint: { executor: "@nx/eslint:lint" },
        test: { executor: "@nx/vite:test" },
        "audit-capabilities": {
          executor: "nx:run-commands",
          options: {
            command: `node tools/audit-capabilities.js ${projectNames.fileName}`,
            cwd: "{workspaceRoot}",
          },
        },
        "audit-shadows": {
          executor: "nx:run-commands",
          options: {
            command: `node tools/audit-shadows.js ${projectNames.fileName}`,
            cwd: "{workspaceRoot}",
          },
        },
      },
      tags: [`scope:${projectNames.fileName}`, "type:app"],
    });
  }

  // ── Step 6: Dry-run diff output ─────────────────────────────────────────────
  if (dryRun) {
    printDiff(tree, projectRoot);
    // Return without calling formatFiles — NX discards the virtual tree on dry-run.
    return;
  }

  await formatFiles(tree);
}

// ── helpers ───────────────────────────────────────────────────────────────────

const toPascal = (s: string) => names(s).className;

/**
 * Writes `content` to `filePath` only if the file does not already exist.
 * This makes all route-stub generation idempotent across re-runs.
 */
function writeRouteStub(tree: Tree, filePath: string, content: string) {
  if (!tree.exists(filePath)) {
    tree.write(filePath, content);
  }
}

// ── route stub generators ─────────────────────────────────────────────────────

function genAuthStrategyFile(platform: string, auth: AuthBlock): string {
  const UPPER = platform.toUpperCase().replace(/-/g, "_");

  if (auth.type === "oauth2-refresh" || auth.type === "oauth2-static") {
    const o2 = auth.oauth2!;
    const scopesLine = (o2.scopes ?? []).map((s) => `"${s}"`).join(", ");
    const extraParamsBlock = o2.extraParams
      ? `\n    extraParams: {\n${Object.entries(o2.extraParams)
          .map(([k, v]) => `      ${k}: "${v}"`)
          .join(",\n")},\n    },`
      : "";
    const rotatingLine =
      auth.type === "oauth2-refresh" && o2.rotatingRefreshToken
        ? "\n    rotatingRefreshToken: true,"
        : "";
    const authMethodLine = o2.tokenEndpointAuthMethod
      ? `\n    tokenEndpointAuthMethod: "${o2.tokenEndpointAuthMethod}",`
      : "";

    return `import { createAuthStrategy } from "@mp/auth";
import { SupabaseTokenStore } from "@mp/token-storage";
import { createClient } from "@supabase/supabase-js";

import { env } from "./config";

export const authStrategy = createAuthStrategy({
  type: "${auth.type}",
  oauth2: {
    authorizeUrl: "${o2.authorizeUrl}",
    tokenUrl: "${o2.tokenUrl}",
    scopes: [${scopesLine}],${extraParamsBlock}${rotatingLine}${authMethodLine}
    clientId: env.${UPPER}_CLIENT_ID,
    clientSecret: env.${UPPER}_CLIENT_SECRET,
    redirectUri: env.${UPPER}_REDIRECT_URI,
  },
  tokenStore: new SupabaseTokenStore(
    createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY),
  ),
});
`;
  }

  if (auth.type === "oauth1") {
    const o1 = auth.oauth1!;
    return `import { createAuthStrategy } from "@mp/auth";
import { SupabaseTokenStore } from "@mp/token-storage";
import { createClient } from "@supabase/supabase-js";

import { env } from "./config";

export const authStrategy = createAuthStrategy({
  type: "oauth1",
  oauth1: {
    requestTokenUrl: "${o1.requestTokenUrl}",
    authorizeUrl: "${o1.authorizeUrl}",
    accessTokenUrl: "${o1.accessTokenUrl}",
    signatureMethod: "${o1.signatureMethod}",
    consumerKey: env.${UPPER}_CONSUMER_KEY,
    consumerSecret: env.${UPPER}_CONSUMER_SECRET,
    callbackUrl: env.${UPPER}_CALLBACK_URL,
  },
  tokenStore: new SupabaseTokenStore(
    createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY),
  ),
});
`;
  }

  // api-key
  return `import { createAuthStrategy } from "@mp/auth";
import { SupabaseTokenStore } from "@mp/token-storage";
import { createClient } from "@supabase/supabase-js";

import { env } from "./config";

export const authStrategy = createAuthStrategy({
  type: "api-key",
  tokenStore: new SupabaseTokenStore(
    createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY),
  ),
});
`;
}

function genAuthStatusRoute(platform: string) {
  return `import { type NextRequest, NextResponse } from "next/server";

import { get${toPascal(platform)}UserIdFromSession } from "@/helpers/${platform}UserId";
import { authStrategy } from "@/lib/authStrategy";

export async function GET(request: NextRequest) {
  const userId = await get${toPascal(platform)}UserIdFromSession(request);
  if (!userId) return NextResponse.json({ connected: false });
  const result = await authStrategy.status(userId);
  return NextResponse.json(result);
}
`;
}

function genDisconnectRoute(platform: string) {
  return `import { type NextRequest, NextResponse } from "next/server";

import { get${toPascal(platform)}UserIdFromSession } from "@/helpers/${platform}UserId";
import { authStrategy } from "@/lib/authStrategy";

export async function POST(request: NextRequest) {
  const userId = await get${toPascal(platform)}UserIdFromSession(request);
  if (!userId) return NextResponse.json({ ok: true });
  await authStrategy.revoke(userId);
  return NextResponse.json({ ok: true });
}
`;
}

function genConnectRoute(platform: string, auth: AuthBlock | undefined) {
  if (auth?.type === "api-key") {
    return `import { type NextRequest, NextResponse } from "next/server";

import { get${toPascal(platform)}UserIdFromSession } from "@/helpers/${platform}UserId";
import { authStrategy } from "@/lib/authStrategy";

export async function POST(request: NextRequest) {
  const userId = await get${toPascal(platform)}UserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const { apiKey } = (await request.json()) as { apiKey: string };
  await authStrategy.handleCallback({ apiKey }, userId);
  return NextResponse.json({ ok: true });
}
`;
  }

  return `import { type NextRequest, NextResponse } from "next/server";

import { get${toPascal(platform)}UserIdFromSession } from "@/helpers/${platform}UserId";
import { authStrategy } from "@/lib/authStrategy";

export async function GET(request: NextRequest) {
  const userId = await get${toPascal(platform)}UserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const state = crypto.randomUUID();
  return NextResponse.redirect(authStrategy.getConnectUrl(state));
}
`;
}

function genOAuthCallbackRoute(platform: string) {
  return `import { type NextRequest, NextResponse } from "next/server";

import { get${toPascal(platform)}UserIdFromSession } from "@/helpers/${platform}UserId";
import { authStrategy } from "@/lib/authStrategy";

export async function GET(request: NextRequest) {
  const userId = await get${toPascal(platform)}UserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  const params = Object.fromEntries(request.nextUrl.searchParams);
  await authStrategy.handleCallback(params, userId);
  return NextResponse.redirect(new URL("/", request.url));
}
`;
}

function genRefreshRoute(platform: string) {
  return `import { type NextRequest, NextResponse } from "next/server";

import { get${toPascal(platform)}UserIdFromSession } from "@/helpers/${platform}UserId";
import { authStrategy } from "@/lib/authStrategy";

export async function POST(request: NextRequest) {
  const userId = await get${toPascal(platform)}UserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  await authStrategy.getValidToken(userId);
  return NextResponse.json({ ok: true });
}
`;
}

function genSitesRoute(platform: string) {
  return `import { NextResponse } from "next/server";

// TODO: Return the list of ${platform} sites/orgs the user has access to.
export async function GET() {
  return NextResponse.json({ resources: [], selectedSite: null, selectedProject: null });
}
`;
}

function genSelectSiteRoute(platform: string) {
  return `import { NextRequest, NextResponse } from "next/server";

// TODO: Persist the user's selected ${platform} site.
export async function POST(req: NextRequest) {
  const { siteId } = (await req.json()) as { siteId: string };
  void siteId;
  return NextResponse.json({ ok: true });
}
`;
}

function genProjectsRoute(platform: string) {
  return `import { NextRequest, NextResponse } from "next/server";

import { ${toPascal(platform)}AuthError } from "@/exceptions/${platform}Errors";
import { clear${toPascal(platform)}Cookie } from "@/helpers/cookies";
import { get${toPascal(platform)}UserIdFromSession } from "@/helpers/${platform}UserId";
import { ${toPascal(platform)}ServiceAdapter } from "@/platforms/${platform}/${toPascal(platform)}ServiceAdapter";

// Projects return [] (not 401) when there is no active connection so the UI
// can detect connection state without triggering auth-failure dialogs.
export async function GET(request: NextRequest) {
  const userId = await get${toPascal(platform)}UserIdFromSession(request);
  if (!userId) return NextResponse.json([]);

  try {
    const adapter = new ${toPascal(platform)}ServiceAdapter(userId);
    const projects = await adapter.getProjects();
    return NextResponse.json(projects);
  } catch (error) {
    if (error instanceof ${toPascal(platform)}AuthError) {
      await clear${toPascal(platform)}Cookie();
      return NextResponse.json({ error: (error as Error).message }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "";
    if (message.includes("No active") || message.includes("no active")) {
      await clear${toPascal(platform)}Cookie();
      return NextResponse.json([]);
    }
    console.error("Failed to load ${platform} projects:", error);
    return NextResponse.json({ error: "Failed to load ${platform} projects." }, { status: 500 });
  }
}
`;
}

function genSelectProjectRoute(platform: string) {
  return `import { NextRequest, NextResponse } from "next/server";

// TODO: Persist the user's selected ${platform} project.
export async function POST(req: NextRequest) {
  const { projectKey } = (await req.json()) as { projectKey: string };
  void projectKey;
  return NextResponse.json({ ok: true });
}
`;
}

function genIssuesRoute(_platform: string) {
  return `import { NextRequest, NextResponse } from "next/server";

import { withAdapter } from "@/lib/platformRoute";

export async function GET(request: NextRequest) {
  const projectKey = request.nextUrl.searchParams.get("projectKey");
  const cursor = request.nextUrl.searchParams.get("cursor") ?? undefined;

  if (!projectKey?.trim()) {
    return NextResponse.json(
      { error: "Missing required query parameter: projectKey" },
      { status: 400 },
    );
  }

  return withAdapter(request, (adapter) =>
    adapter.getTasks(projectKey.trim(), cursor?.trim() || undefined),
  );
}

// TODO: Add POST handler to create a task (validate body, call adapter.createTask).
`;
}

function genIssueRoute(_platform: string) {
  return `import { NextRequest, NextResponse } from "next/server";

import { withAdapter } from "@/lib/platformRoute";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ issueIdOrKey: string }> },
) {
  const { issueIdOrKey } = await params;
  return withAdapter(request, (adapter) => adapter.getTask(issueIdOrKey));
}

// TODO: Add PATCH handler to update a task (validate body, call adapter.updateTask).
// TODO: Add DELETE handler to delete a task (call adapter.deleteTask, return status).
`;
}

function genTransitionsRoute(_platform: string) {
  return `import { NextRequest, NextResponse } from "next/server";

import { withAdapter } from "@/lib/platformRoute";

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
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const { transitionId } = body as Record<string, unknown>;
  if (!transitionId || typeof transitionId !== "string") {
    return NextResponse.json({ error: "transitionId is required." }, { status: 400 });
  }
  return withAdapter(request, async (adapter) => {
    await adapter.changeStatus(issueIdOrKey, transitionId);
    return { success: true };
  });
}
`;
}

function genIssueTypesRoute(_platform: string) {
  return `import { NextRequest } from "next/server";

import { withAdapter } from "@/lib/platformRoute";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId") ?? "";
  return withAdapter(request, (adapter) => adapter.getIssueTypes(projectId));
}
`;
}

function genPrioritiesRoute(_platform: string) {
  return `import { NextRequest } from "next/server";

import { withAdapter } from "@/lib/platformRoute";

export async function GET(request: NextRequest) {
  const projectId = request.nextUrl.searchParams.get("projectId") ?? "";
  if (projectId) {
    return withAdapter(request, (adapter) => adapter.getProjectPriorities(projectId));
  }
  return withAdapter(request, (adapter) => adapter.getPriorities());
}
`;
}

function genAssigneesRoute(_platform: string) {
  return `import { NextRequest } from "next/server";

import { withAdapter } from "@/lib/platformRoute";

export async function GET(request: NextRequest) {
  const projectIdOrKey = request.nextUrl.searchParams.get("projectIdOrKey") ?? "";
  const query = request.nextUrl.searchParams.get("query") ?? undefined;
  return withAdapter(request, (adapter) => adapter.getAssignees({ projectIdOrKey, query }));
}
`;
}

function genCurrentUserRoute(_platform: string) {
  return `import { NextRequest } from "next/server";

import { withAdapter } from "@/lib/platformRoute";

export async function GET(request: NextRequest) {
  return withAdapter(request, (adapter) => adapter.getCurrentUser());
}
`;
}

function genStatusesRoute(_platform: string) {
  return `import { NextRequest } from "next/server";

import { withAdapter } from "@/lib/platformRoute";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ projectKey: string }> },
) {
  const { projectKey } = await params;
  return withAdapter(request, (adapter) => adapter.getProjectStatuses(projectKey));
}
`;
}

function genCommentsRoute(_platform: string) {
  return `import { NextRequest } from "next/server";

import { withAdapter } from "@/lib/platformRoute";

export async function GET(request: NextRequest) {
  const issueIdOrKey = request.nextUrl.searchParams.get("issueIdOrKey") ?? "";
  return withAdapter(request, (adapter) => adapter.getComments(issueIdOrKey));
}

export async function POST(request: NextRequest) {
  const payload = (await request.json()) as import("@mp/task-core").AddCommentPayload;
  return withAdapter(request, (adapter) => adapter.createComment(payload));
}
`;
}

function genPermissionsRoute(_platform: string) {
  return `import { NextRequest } from "next/server";

import { withAdapter } from "@/lib/platformRoute";

export async function GET(request: NextRequest) {
  const permission = request.nextUrl.searchParams.get("permission") ?? "";
  const issueKey = request.nextUrl.searchParams.get("issueKey") ?? undefined;
  const projectKey = request.nextUrl.searchParams.get("projectKey") ?? undefined;
  return withAdapter(request, async (adapter) => {
    const hasPermission = await adapter.getPermission(permission, { issueKey, projectKey });
    return { hasPermission };
  });
}
`;
}

function genAttachmentRoute(_platform: string) {
  return `import { NextRequest } from "next/server";

import { withAdapter } from "@/lib/platformRoute";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;
  return withAdapter(request, (adapter) => adapter.getAttachmentContent(attachmentId));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;
  return withAdapter(request, async (adapter) => {
    await adapter.deleteAttachment(attachmentId);
    return null;
  });
}
`;
}

function genParseRequirementsRoute(_platform: string) {
  return `import { NextRequest, NextResponse } from "next/server";

// TODO: Call your AI service to parse requirements text into a work breakdown draft.
export async function POST(req: NextRequest) {
  void req;
  return NextResponse.json({ draftId: "" });
}
`;
}

function genWorkbreakdownRoute(_platform: string) {
  return `import { NextRequest, NextResponse } from "next/server";

// TODO: POST to create a new work breakdown draft; GET to list drafts.
export async function POST(req: NextRequest) {
  void req;
  return NextResponse.json({ draftId: "" });
}

export async function GET() {
  return NextResponse.json([]);
}
`;
}

function genWorkbreakdownDraftRoute(_platform: string) {
  return `import { NextRequest, NextResponse } from "next/server";

// TODO: GET returns the draft; PATCH applies an operation (updateNode, deleteNode, addChild).
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const { draftId } = await params;
  void draftId;
  return NextResponse.json({ draftId, items: [] });
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const { draftId } = await params;
  void draftId;
  void req;
  return NextResponse.json({ ok: true });
}
`;
}

function genWorkbreakdownPublishRoute(_platform: string) {
  return `import { NextRequest, NextResponse } from "next/server";

// TODO: Create platform issues from the draft items in order (parents first).
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ draftId: string }> },
) {
  const { draftId } = await params;
  void draftId;
  void req;
  return NextResponse.json({ draftId, created: [], errors: [], status: "completed" });
}
`;
}
