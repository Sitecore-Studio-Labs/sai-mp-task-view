import { spawnSync } from "node:child_process";

import type { Tree } from "@nx/devkit";
import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  names,
  offsetFromRoot,
  readProjectConfiguration,
  updateProjectConfiguration,
} from "@nx/devkit";
import { createTwoFilesPatch } from "diff";
import * as fs from "fs";
import * as yaml from "js-yaml";
import * as path from "path";
import prettier from "prettier";

import type { PlatformAppGeneratorSchema } from "./schema";

// ── Types ────────────────────────────────────────────────────────────────────

interface AuthBlock {
  type: "oauth2-refresh" | "oauth2-static" | "oauth1" | "api-key";
  oauth2?: {
    authorizeUrl: string;
    tokenUrl: string;
    scopes?: string[];
    /** e.g. `", "` for Wrike (comma-separated scopes in one param). */
    scopeSeparator?: string;
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
  e2e?: {
    enabled?: boolean;
  };
  auth?: AuthBlock;
}

interface ValidationError {
  path: string;
  message: string;
}

// ── YAML validation ───────────────────────────────────────────────────────────

function validateCapabilityMatrix(
  raw: unknown,
  opts: { requirePlatform?: boolean; workspaceRoot?: string } = {},
): ValidationError[] {
  const { requirePlatform = true, workspaceRoot } = opts;
  const errors: ValidationError[] = [];

  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    errors.push({ path: "(root)", message: "YAML must be a mapping object" });
    return errors;
  }

  const obj = raw as Record<string, unknown>;

  // platform section — required for concrete platform YAMLs, optional for base/defaults files
  if (!obj["platform"] || typeof obj["platform"] !== "object" || Array.isArray(obj["platform"])) {
    if (requirePlatform) {
      errors.push({ path: "platform", message: "Required mapping is missing" });
    }
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
    // Load all known flags dynamically so new flags added via add-capability.js
    // are validated without requiring a manual update here.
    const flagsConfig = workspaceRoot ? loadCapabilityFlags(workspaceRoot) : null;
    const boolFlags: readonly string[] = flagsConfig
      ? [...flagsConfig.providerFlags, ...flagsConfig.routeFlags]
      : [
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
        ];

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

  if ("e2e" in obj) {
    const e2e = obj["e2e"];
    if (!e2e || typeof e2e !== "object" || Array.isArray(e2e)) {
      errors.push({ path: "e2e", message: "Must be a mapping object when present" });
    } else if (
      "enabled" in e2e &&
      typeof (e2e as Record<string, unknown>)["enabled"] !== "boolean"
    ) {
      errors.push({
        path: "e2e.enabled",
        message: `Must be a boolean (true or false), got: ${JSON.stringify((e2e as Record<string, unknown>)["enabled"])}`,
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
function loadAndResolveMatrix(
  yamlPath: string,
  workspaceRoot: string,
  isBase = false,
): CapabilityMatrix {
  const rawYaml = fs.readFileSync(yamlPath, "utf-8");
  const raw = yaml.load(rawYaml) as CapabilityMatrix & { extends?: string };

  // Base/defaults files (loaded via `extends:`) are not required to have a platform section.
  const errors = validateCapabilityMatrix(raw, { requirePlatform: !isBase, workspaceRoot });
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

  const base = loadAndResolveMatrix(basePath, workspaceRoot, true);

  // Deep merge: base caps first, derived caps win; platform/auth/e2e are fully from derived if present
  return {
    platform: raw.platform,
    capabilities: { ...base.capabilities, ...raw.capabilities },
    e2e: raw.e2e ?? base.e2e,
    // auth block is taken wholesale from derived; no sub-key merging
    auth: raw.auth ?? base.auth,
  };
}

// ── Diff reporter ─────────────────────────────────────────────────────────────

const TEXT_FILE_FOR_PATCH = /\.(tsx?|jsx?|css|cjs|mjs|json|md|ya?ml)$/i;

function fileChangeContentToString(content: unknown): string {
  if (content == null) return "";
  if (typeof content === "string") return content;
  if (Buffer.isBuffer(content)) return content.toString("utf-8");
  return String(content);
}

function trimPatchOutput(patch: string, maxLines: number): string {
  const lines = patch.split("\n");
  if (lines.length <= maxLines) return patch;
  const omitted = lines.length - maxLines;
  return `${lines.slice(0, maxLines).join("\n")}\n\n... (${omitted} more lines omitted)\n`;
}

const normalizeEol = (s: string) => s.replace(/\r\n/g, "\n");

/** Same Prettier pass as the capabilities-provider sync check so diffs are not formatting noise. */
async function formatLikeCapabilitiesProvider(absPath: string, source: string): Promise<string> {
  if (!source) return "";
  try {
    return normalizeEol(await prettier.format(source, { filepath: absPath, parser: "typescript" }));
  } catch {
    return normalizeEol(source);
  }
}

function changeMatchesProjectRoots(changePath: string, projectRoots: string[]): boolean {
  return projectRoots.some((root) => changePath === root || changePath.startsWith(`${root}/`));
}

async function printDiff(tree: Tree, projectRoots: string[]): Promise<void> {
  const changes = tree.listChanges();

  const appChanges = changes.filter((c) => changeMatchesProjectRoots(c.path, projectRoots));

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

  const root = tree.root;
  const patchChunks: string[] = [];

  for (const change of updated) {
    if (!TEXT_FILE_FOR_PATCH.test(change.path)) continue;
    const abs = path.join(root, change.path);
    const beforeRaw = fs.existsSync(abs) ? fs.readFileSync(abs, "utf-8") : "";
    const afterRaw = fileChangeContentToString(change.content);
    const usePrettierBothSides = /\.tsx?$/i.test(change.path);
    const [before, after] = usePrettierBothSides
      ? await Promise.all([
          formatLikeCapabilitiesProvider(abs, beforeRaw),
          formatLikeCapabilitiesProvider(abs, afterRaw),
        ])
      : [beforeRaw, afterRaw];
    if (before === after) continue;
    const patch = createTwoFilesPatch(
      change.path + (usePrettierBothSides ? " (formatted)" : " (on disk)"),
      change.path + (usePrettierBothSides ? " (from YAML → generated)" : " (generated)"),
      before,
      after,
      "",
      "",
      { context: 3 },
    );
    const bodyLines = patch.split("\n").filter((ln) => /^[-+]/.test(ln) || ln.startsWith("@@"));
    if (bodyLines.length === 0) continue;
    patchChunks.push(trimPatchOutput(patch, 320));
  }

  for (const change of created) {
    if (!TEXT_FILE_FOR_PATCH.test(change.path)) continue;
    const after = fileChangeContentToString(change.content);
    const patch = createTwoFilesPatch("/dev/null", change.path + " (new)", "", after, "", "", {
      context: 3,
    });
    const bodyLines = patch.split("\n").filter((ln) => /^[-+]/.test(ln) || ln.startsWith("@@"));
    if (bodyLines.length === 0) continue;
    patchChunks.push(trimPatchOutput(patch, 320));
  }

  for (const change of deleted) {
    if (!TEXT_FILE_FOR_PATCH.test(change.path)) continue;
    const abs = path.join(root, change.path);
    const before = fs.existsSync(abs) ? fs.readFileSync(abs, "utf-8") : "";
    const patch = createTwoFilesPatch(change.path + " (on disk)", "/dev/null", before, "", "", "", {
      context: 3,
    });
    const bodyLines = patch.split("\n").filter((ln) => /^[-+]/.test(ln) || ln.startsWith("@@"));
    if (bodyLines.length === 0) continue;
    patchChunks.push(trimPatchOutput(patch, 320));
  }

  if (patchChunks.length > 0) {
    console.log(
      `\n[dry-run] Unified diff(s) (.ts/.tsx compared after Prettier, same rule as sync — not raw file shape):\n`,
    );
    for (const chunk of patchChunks) {
      console.log(chunk.endsWith("\n") ? chunk : `${chunk}\n`);
    }
  }

  console.log(`\nRun without --dry-run to apply these changes.\n`);
}

// ── Capability flags config ───────────────────────────────────────────────────

interface CapabilityFlagsConfig {
  providerFlags: string[];
  routeFlags: string[];
}

/**
 * Loads `capabilities/capability-flags.json` from the workspace root.
 * Falls back to a hardcoded list if the file is absent (e.g. during tests).
 */
function loadCapabilityFlags(workspaceRoot: string): CapabilityFlagsConfig {
  const flagsPath = path.join(workspaceRoot, "capabilities", "capability-flags.json");
  if (fs.existsSync(flagsPath)) {
    return JSON.parse(fs.readFileSync(flagsPath, "utf-8")) as CapabilityFlagsConfig;
  }
  console.warn(
    "[platform-app] capabilities/capability-flags.json not found; using built-in flag list.",
  );
  return {
    providerFlags: [
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
    ],
    routeFlags: ["hasSites"],
  };
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
  providerFlags?: string[];
}): string {
  const { caps, providerFlags: providerFlagsRaw } = vars;
  const providerFlags = providerFlagsRaw ?? [];
  const capsRecord = caps as Record<string, unknown>;
  const boolLines = providerFlags.map((f) => `  ${f}: ${capsRecord[f] ?? false},`).join("\n");
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
${boolLines}
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

/**
 * Copy Tailwind v4 / theme globals from the Jira app so new platform apps match styling.
 * The copied file contains `@source "../../../../libs/ui/src"` which assumes the app lives
 * at `apps/<name>/` depth (4 levels up to workspace root). Apps nested deeper would need
 * the path adjusted after generation.
 */
function seedAppGlobalsCssFromJira(tree: Tree, projectRoot: string): void {
  const jiraGlobals = path.join(tree.root, "apps/jira/src/app/globals.css");
  const destGlobals = `${projectRoot}/src/app/globals.css`;
  if (!fs.existsSync(jiraGlobals)) {
    console.warn(
      `[platform-app] Reference ${path.relative(tree.root, jiraGlobals)} not found; skipped writing ${destGlobals}.`,
    );
    return;
  }
  tree.write(destGlobals, fs.readFileSync(jiraGlobals, "utf-8"));
}

/**
 * Ensures root `eslint.config.mjs` lists this app for `import/resolver` + Next `rootDir`,
 * so `@/` path aliases resolve under ESLint (same as TypeScript).
 */
function ensureEslintConfigIncludesApp(tree: Tree, appFolderName: string): void {
  const eslintPath = "eslint.config.mjs";
  if (!tree.exists(eslintPath)) return;
  const raw = tree.read(eslintPath, "utf-8");
  if (!raw) return;
  let content = raw;

  const tsRef = `"apps/${appFolderName}/tsconfig.json"`;
  if (!content.includes(tsRef)) {
    // Find any existing app tsconfig entry as an insertion anchor.
    const existingEntryRe = /"apps\/[^"]+\/tsconfig\.json",/;
    if (existingEntryRe.test(content)) {
      content = content.replace(existingEntryRe, (m) => `${m}\n            ${tsRef},`);
    } else {
      console.warn(
        `[platform-app] eslint.config.mjs: no existing apps/*/tsconfig.json entry found; add ${tsRef} to import/resolver typescript.project manually.`,
      );
      return;
    }
  }

  const appRoot = `"apps/${appFolderName}"`;
  if (!content.includes(appRoot)) {
    content = content.replace(
      /(rootDir:\s*\[)([^\]]*)(\])/s,
      (_m, start: string, inner: string, end: string) => {
        if (inner.includes(appFolderName)) return `${start}${inner}${end}`;
        const trimmed = inner.replace(/\s+$/u, "").replace(/,\s*$/u, "");
        return `${start}${trimmed}, ${appRoot}${end}`;
      },
    );
  }

  if (content !== raw) {
    tree.write(eslintPath, content);
    console.log(
      `[platform-app] Updated ${eslintPath} for app "${appFolderName}" (ESLint import resolver + Next rootDir).`,
    );
  }
}

// ── Main generator ────────────────────────────────────────────────────────────

function isNxCliDryRun(): boolean {
  return (
    process.argv.includes("--dryRun") ||
    process.argv.includes("--dry-run") ||
    process.argv.some((arg) => /^(?:--dryRun|--dry-run)=/u.test(arg))
  );
}

function isNxCliE2e(): boolean {
  return process.argv.includes("--e2e") || process.argv.some((arg) => /^--e2e=/u.test(arg));
}

export default async function generator(tree: Tree, options: PlatformAppGeneratorSchema) {
  const {
    name,
    yamlFile,
    dryRun: dryRunOption = false,
    update = false,
    e2e: e2eOption = false,
    force = false,
    initialCommit = true,
  } = options;
  /** Nx `nx g ... --dryRun` does not always set `options.dryRun` on the schema; detect the CLI flag too. */
  const dryRun = Boolean(dryRunOption) || isNxCliDryRun();
  const e2eOnly = Boolean(e2eOption) || isNxCliE2e();
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
  const e2eEnabled = matrix.e2e?.enabled === true;
  const e2eProjectName = `${projectNames.fileName}-e2e`;
  const e2eProjectRoot = `apps/${e2eProjectName}`;

  // ── Step 2: Detect existing app ────────────────────────────────────────────
  const appExists = tree.exists(projectRoot);

  if (e2eOnly && update) {
    throw new Error(
      "Cannot use --e2e with --update.\n\n" +
        "  --e2e     Scaffold only apps/<name>-e2e (no capabilities provider or route stubs).\n" +
        "  --update  Sync the main app from YAML (capabilities provider + route stubs).\n",
    );
  }

  if (e2eOnly) {
    if (!e2eEnabled) {
      throw new Error(
        `--e2e requires e2e.enabled: true in ${yamlFile}.\n` +
          "Add:\n\n  e2e:\n    enabled: true\n",
      );
    }
    if (!appExists) {
      throw new Error(
        `--e2e requires an existing app at ${projectRoot}. Scaffold the app first, then run with --e2e.`,
      );
    }

    scaffoldE2eProject(tree, {
      e2eProjectRoot,
      e2eProjectName,
      appName: projectNames.fileName,
      suiteClassName: `${projectNames.className}TaskSuite`,
      platformDisplay: platform.displayName,
      offsetFromRoot: offsetFromRoot(e2eProjectRoot),
      force,
      dryRun,
    });

    if (dryRun) {
      await printDiff(tree, [e2eProjectRoot]);
      return;
    }

    await formatFiles(tree);
    console.log(`[e2e] Scaffolded ${e2eProjectRoot}. Run: nx run ${e2eProjectName}:e2e`);
    return;
  }

  if (appExists && !update && !force && !dryRun) {
    throw new Error(
      `App "${projectRoot}" already exists.\n\n` +
        `  --update  Add new route stubs + regenerate capabilities provider, preserve everything else.\n` +
        `  --e2e     Scaffold only apps/<name>-e2e (requires e2e.enabled: true in YAML).\n` +
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
    // Derived: true for any OAuth flow (oauth2-refresh, oauth2-static, oauth1).
    // Templates use this to conditionally render auth-failure providers and popup handlers.
    hasOAuth: !!(auth && auth.type !== "api-key"),
    offsetFromRoot: offsetFromRoot(projectRoot),
    tmpl: "",
  };

  const capabilitiesProviderPath = `${projectRoot}/src/providers/${projectNames.className}PlatformCapabilitiesProvider.tsx`;

  if (!appExists || force) {
    // First run or forced overwrite: generate everything from templates.
    generateFiles(tree, path.join(__dirname, "files"), projectRoot, templateVars);
    seedAppGlobalsCssFromJira(tree, projectRoot);

    // Remove the OAuth auth-failure provider for platforms that don't use OAuth.
    if (!auth || auth.type === "api-key") {
      const authFailurePath = `${projectRoot}/src/providers/auth-providers/${projectNames.className}AuthFailureProvider.tsx`;
      if (tree.exists(authFailurePath)) tree.delete(authFailurePath);
    }
  } else {
    // Update mode: always regenerate the capabilities provider from YAML.
    // All other template files are preserved (developer may have edited them).
    const destGlobals = `${projectRoot}/src/app/globals.css`;
    if (!tree.exists(destGlobals)) {
      seedAppGlobalsCssFromJira(tree, projectRoot);
    }
    const capabilityFlags = loadCapabilityFlags(tree.root);
    const nextCapabilities = genCapabilitiesProvider({
      className: projectNames.className,
      constantName: projectNames.constantName,
      platform: platform.name,
      platformDisplay: platform.displayName,
      connectionTitle: templateVars.connectionTitle,
      connectionDescription: templateVars.connectionDescription,
      caps,
      providerFlags: capabilityFlags.providerFlags,
    });
    const absCapabilities = path.join(tree.root, capabilitiesProviderPath);
    const existingOnDisk = fs.existsSync(absCapabilities)
      ? fs.readFileSync(absCapabilities, "utf-8")
      : null;
    const [formattedExisting, formattedNext] = await Promise.all([
      existingOnDisk
        ? prettier.format(existingOnDisk, { filepath: absCapabilities, parser: "typescript" })
        : Promise.resolve(""),
      prettier.format(nextCapabilities, { filepath: absCapabilities, parser: "typescript" }),
    ]);
    if (normalizeEol(formattedExisting) !== normalizeEol(formattedNext)) {
      tree.write(capabilitiesProviderPath, nextCapabilities);
      if (dryRun) {
        console.log(
          `[update] Capabilities provider differs from ${path.basename(yamlFile)} — see dry-run diff below (disk unchanged).`,
        );
      } else {
        console.log(
          `[update] Regenerated ${capabilitiesProviderPath} from ${path.basename(yamlFile)}.`,
        );
      }
    } else {
      console.log(`[update] Capabilities provider already matches ${path.basename(yamlFile)}.`);
    }
  }

  // ── Step 4: Write conditional API route stubs ───────────────────────────────
  // writeRouteStub skips existing files — always safe to call, idempotent.
  const apiBase = `${projectRoot}/src/app/api`;
  const platformSlug = platform.name;

  writeRouteStub(
    tree,
    `${projectRoot}/src/lib/config.ts`,
    genEnvConfigFile(platform.name, auth, caps),
  );

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

  // ── Step 5: Register NX project ────────────────────────────────────────────
  if (!appExists || force) {
    const projectConfig = {
      root: projectRoot,
      projectType: "application" as const,
      sourceRoot: `${projectRoot}/src`,
      targets: {
        build: {
          executor: "@nx/next:build",
          outputs: ["{options.outputPath}"],
          options: { outputPath: `dist/apps/${projectNames.fileName}` },
        },
        serve: {
          executor: "nx:run-commands",
          defaultConfiguration: "development",
          options: {
            command: "next dev --webpack",
            cwd: `{workspaceRoot}/apps/${projectNames.fileName}`,
          },
          configurations: {
            development: { command: "next dev --webpack" },
            production: { command: "next start" },
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
        "check-sync": {
          executor: "nx:run-commands",
          options: {
            command: `node tools/check-capabilities-sync.js ${projectNames.fileName}`,
            cwd: "{workspaceRoot}",
          },
        },
        "sync-capabilities": {
          executor: "nx:run-commands",
          options: {
            command: `nx g @mp/generators:platform-app ${projectNames.fileName} --yamlFile capabilities/${projectNames.fileName}.yaml --update`,
            cwd: "{workspaceRoot}",
          },
        },
        "check-template-drift": {
          executor: "nx:run-commands",
          options: {
            command: `nx g @mp/generators:platform-app ${projectNames.fileName} --yamlFile capabilities/${projectNames.fileName}.yaml --force --dryRun`,
            cwd: "{workspaceRoot}",
          },
        },
      },
      tags: [`scope:${projectNames.fileName}`, "type:app"],
    };

    if (appExists) {
      // force mode on an existing app: update the registered project config rather
      // than trying to add it again (addProjectConfiguration throws if already present).
      updateProjectConfiguration(tree, projectNames.fileName, projectConfig);
    } else {
      addProjectConfiguration(tree, projectNames.fileName, projectConfig);
      ensureEslintConfigIncludesApp(tree, projectNames.fileName);
    }
  }

  // ── Step 5b: E2E project (when capabilities YAML has e2e.enabled: true) ─────
  if (e2eEnabled) {
    scaffoldE2eProject(tree, {
      e2eProjectRoot,
      e2eProjectName,
      appName: projectNames.fileName,
      suiteClassName: `${projectNames.className}TaskSuite`,
      platformDisplay: platform.displayName,
      offsetFromRoot: offsetFromRoot(e2eProjectRoot),
      force,
      dryRun,
    });
  }

  // ── Step 6: Dry-run diff output ─────────────────────────────────────────────
  const dryRunRoots = [projectRoot, ...(e2eEnabled ? [e2eProjectRoot] : [])];
  if (dryRun) {
    await printDiff(tree, dryRunRoots);
    // Return without calling formatFiles — NX discards the virtual tree on dry-run.
    return;
  }

  await formatFiles(tree);

  if (!appExists && initialCommit) {
    const commitPaths = [
      projectRoot,
      ...(e2eEnabled && tree.exists(e2eProjectRoot) ? [e2eProjectRoot] : []),
    ];
    return () => createInitialAppCommit(tree.root, commitPaths, projectNames.fileName);
  }
}

interface ScaffoldE2eOptions {
  e2eProjectRoot: string;
  e2eProjectName: string;
  appName: string;
  suiteClassName: string;
  platformDisplay: string;
  offsetFromRoot: string;
  force: boolean;
  dryRun: boolean;
}

function scaffoldE2eProject(tree: Tree, opts: ScaffoldE2eOptions): void {
  const {
    e2eProjectRoot,
    e2eProjectName,
    appName,
    suiteClassName,
    platformDisplay,
    offsetFromRoot: e2eOffsetFromRoot,
    force,
    dryRun,
  } = opts;

  const e2eScaffolded = tree.exists(`${e2eProjectRoot}/playwright.config.ts`);
  if (e2eScaffolded && !force) {
    if (!dryRun) {
      console.log(
        `[platform-app] E2E project "${e2eProjectRoot}" already scaffolded — skipped (use --force to overwrite).`,
      );
    }
    return;
  }

  const e2eTemplateVars = {
    tmpl: "",
    e2eProjectName,
    appName,
    suiteClassName,
    platformDisplay,
    offsetFromRoot: e2eOffsetFromRoot,
  };

  generateFiles(tree, path.join(__dirname, "files-e2e"), e2eProjectRoot, e2eTemplateVars);

  const e2eProjectConfig = {
    root: e2eProjectRoot,
    projectType: "application" as const,
    sourceRoot: `${e2eProjectRoot}/src`,
    implicitDependencies: [appName],
    targets: {
      e2e: {
        executor: "@nx/playwright:playwright",
        outputs: ["{workspaceRoot}/dist/.playwright/apps/" + e2eProjectName],
        options: {
          config: `${e2eProjectRoot}/playwright.config.ts`,
        },
      },
      lint: {
        executor: "@nx/eslint:lint",
        options: {
          lintFilePatterns: [`${e2eProjectRoot}/**/*.ts`],
        },
      },
    },
    tags: [`scope:${appName}`, "type:e2e"],
  };

  let e2eProjectRegistered = false;
  try {
    readProjectConfiguration(tree, e2eProjectName);
    e2eProjectRegistered = true;
  } catch {
    e2eProjectRegistered = false;
  }

  if (e2eProjectRegistered) {
    updateProjectConfiguration(tree, e2eProjectName, e2eProjectConfig);
  } else {
    addProjectConfiguration(tree, e2eProjectName, e2eProjectConfig);
    ensureEslintConfigIncludesApp(tree, e2eProjectName);
  }
}

// ── helpers ───────────────────────────────────────────────────────────────────

const toPascal = (s: string) => names(s).className;

function runGit(workspaceRoot: string, args: string[]) {
  return spawnSync("git", args, {
    cwd: workspaceRoot,
    encoding: "utf-8",
  });
}

function createInitialAppCommit(
  workspaceRoot: string,
  projectRoots: string[],
  projectName: string,
) {
  const trackedPaths = [...projectRoots, "eslint.config.mjs"];
  const add = runGit(workspaceRoot, ["add", "--", ...trackedPaths]);
  if (add.status !== 0) {
    console.warn(
      `[platform-app] Failed to stage generated files for initial commit:\n${add.stderr}`,
    );
    return;
  }

  const diff = runGit(workspaceRoot, ["diff", "--cached", "--quiet", "--", ...trackedPaths]);
  if (diff.status === 0) {
    console.warn(
      `[platform-app] Skipped initial commit for ${projectRoot}: no generated changes were staged.`,
    );
    return;
  }

  const commit = runGit(workspaceRoot, [
    "commit",
    "-m",
    `chore: scaffold ${projectName} app`,
    "--",
    ...trackedPaths,
  ]);

  if (commit.status !== 0) {
    throw new Error(`[platform-app] Initial commit failed:\n${commit.stderr || commit.stdout}`);
  }

  console.log(`[platform-app] Created initial commit for ${projectRoot}.`);
}

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

function genEnvConfigFile(
  platform: string,
  auth: AuthBlock | undefined,
  caps: CapabilityMatrix["capabilities"],
): string {
  const UPPER = platform.toUpperCase().replace(/-/g, "_");
  const lines = [
    "  // Supabase",
    "  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),",
    "  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),",
    "  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),",
    "",
  ];

  if (auth?.type === "oauth2-refresh" || auth?.type === "oauth2-static") {
    lines.push(
      `  // ${toPascal(platform)} OAuth`,
      `  ${UPPER}_CLIENT_ID: z.string().min(1),`,
      `  ${UPPER}_CLIENT_SECRET: z.string().min(1),`,
      `  ${UPPER}_REDIRECT_URI: z.string().url(),`,
      "",
    );
  } else if (auth?.type === "oauth1") {
    lines.push(
      `  // ${toPascal(platform)} OAuth`,
      `  ${UPPER}_CONSUMER_KEY: z.string().min(1),`,
      `  ${UPPER}_CONSUMER_SECRET: z.string().min(1),`,
      `  ${UPPER}_CALLBACK_URL: z.string().url(),`,
      "",
    );
  }

  lines.push(
    `  // ${toPascal(platform)} webhooks (optional)`,
    `  ${UPPER}_WEBHOOK_SECRET: z.string().min(16).optional(),`,
    "",
  );

  if (caps.hasAiWorkBreakdown) {
    lines.push(
      "  // AI (optional; route can fall back to a stub when absent)",
      "  OPENAI_API_KEY: z.string().optional(),",
      '  NEXT_PUBLIC_ENABLE_AI_TASK_CREATION: z.enum(["true", "false"]).optional(),',
      "",
    );
  }

  lines.push("  // App", "  NEXT_PUBLIC_APP_URL: z.string().url().optional(),");

  return `import { validateEnv } from "@mp/env";
import { z } from "zod";

const serverEnvSchema = z.object({
${lines.join("\n")}
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export const env = validateEnv(serverEnvSchema);
`;
}

function genAuthStrategyFile(platform: string, auth: AuthBlock): string {
  const UPPER = platform.toUpperCase().replace(/-/g, "_");

  // Platform-specific table/column names emitted inline so a new platform's
  // DB schema is immediately obvious and doesn't silently fall back to Jira defaults.
  const tokenStoreBlock = `new SupabaseTokenStore(
    createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY),
    {
      connectionsTable: "${platform}_connections",
      sessionsTable: "${platform}_sessions",
      siteColumn: "${platform}_site",
      projectColumn: "${platform}_project",
      accountIdColumn: "${platform}_account_id",
    },
  )`;

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
    const scopeSeparatorLine = o2.scopeSeparator
      ? `\n    scopeSeparator: ${JSON.stringify(o2.scopeSeparator)},`
      : "";

    return `import { createAuthStrategy } from "@mp/auth";
import { SupabaseTokenStore } from "@mp/token-storage";
import { createClient } from "@supabase/supabase-js";

import { env } from "./config";

export const authStrategy = createAuthStrategy({
  type: "${auth.type}",
  oauth2: {
    authorizeUrl: "${o2.authorizeUrl}",
    tokenUrl: "${o2.tokenUrl}",${scopeSeparatorLine}
    scopes: [${scopesLine}],${extraParamsBlock}${rotatingLine}${authMethodLine}
    clientId: env.${UPPER}_CLIENT_ID,
    clientSecret: env.${UPPER}_CLIENT_SECRET,
    redirectUri: env.${UPPER}_REDIRECT_URI,
  },
  tokenStore: ${tokenStoreBlock},
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
  tokenStore: ${tokenStoreBlock},
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
  tokenStore: ${tokenStoreBlock},
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

/**
 * Generic OAuth callback (user must already be in session). If your flow exchanges a code
 * server-side and the token payload includes a dynamic API `host` (as with Wrike), never
 * pass that string into `axios` / `fetch` until it is validated against an allowlist — see
 * `apps/wrike/src/lib/wrikeApiHost.ts` + `apps/wrike/.../callback/route.ts`.
 */
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

function genProjectsRoute(_platform: string) {
  return `import { NextRequest } from "next/server";

import { withAdapterOrEmpty } from "@/lib/platformRoute";

export async function GET(request: NextRequest) {
  return withAdapterOrEmpty(request, (adapter) => adapter.getProjects());
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
