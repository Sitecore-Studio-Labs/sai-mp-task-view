import { spawnSync } from "node:child_process";

import type { Tree } from "@nx/devkit";
import {
  addProjectConfiguration,
  formatFiles,
  generateFiles,
  names,
  offsetFromRoot,
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
    apiStyle?: "rest" | "graphql";
    hasSites?: boolean;
    hasSetupWizard?: boolean;
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

    if ("apiStyle" in caps && !["rest", "graphql"].includes(caps["apiStyle"] as string)) {
      errors.push({
        path: "capabilities.apiStyle",
        message: `Must be one of "rest" | "graphql", got: ${JSON.stringify(caps["apiStyle"])}`,
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

  // Deep merge: base caps first, derived caps win; platform and auth are fully from derived
  return {
    platform: raw.platform,
    capabilities: { ...base.capabilities, ...raw.capabilities },
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

async function printDiff(tree: Tree, projectRoot: string): Promise<void> {
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
    routeFlags: ["hasSites", "hasSetupWizard"],
  };
}

// ── API YAML adapter generation ───────────────────────────────────────────────

interface ApiYamlEntityOp {
  method?: string;
  path?: string;
  queryParams?: Record<string, unknown>;
  response?: { envelope?: string; fields?: Record<string, unknown> };
}

interface ApiYamlEntity {
  platformType?: string;
  list?: ApiYamlEntityOp;
  getOne?: ApiYamlEntityOp;
  create?: ApiYamlEntityOp;
  update?: ApiYamlEntityOp;
  delete?: ApiYamlEntityOp;
}

interface ApiYamlInfo {
  apiPath: string;
  hasEnvelope: boolean;
  hasPagination: boolean;
  paginationParam: string;
  /** The query param name that controls page size (e.g. "pageSize"). Used to detect per-entity pagination. */
  paginationSizeParam: string;
  paginationCursorField: string;
  hasEnrichmentTransforms: boolean;
  entities: Record<string, ApiYamlEntity>;
}

const STANDARD_TRANSFORMS_TS = new Set(["self-array", "comments-array-wrapper"]);

/**
 * Parses `capabilities/<platform>.api.yaml` and extracts the minimal set of
 * data needed to generate the HTTP adapter and HttpAdapter interface.
 * Returns null if the file is absent or malformed.
 */
function parseApiYamlInfo(apiYamlPath: string): ApiYamlInfo | null {
  if (!fs.existsSync(apiYamlPath)) return null;
  let raw: Record<string, unknown>;
  try {
    raw = yaml.load(fs.readFileSync(apiYamlPath, "utf-8")) as Record<string, unknown>;
  } catch {
    return null;
  }
  if (!raw || typeof raw !== "object") return null;

  // Extract API path segment from the full baseUrl.
  // The service file normalises platformSite to the host only (e.g. "https://api.example.com");
  // this path (e.g. "/api/v4") is appended in the adapter constructor.
  const baseUrl = (raw["baseUrl"] as string | undefined) ?? "";
  let apiPath = "";
  try {
    const url = new URL(baseUrl);
    apiPath = url.pathname.replace(/\/$/, "");
  } catch {
    // baseUrl is not a full URL — leave apiPath empty, developer fills it in
  }

  const entities = (raw["entities"] as Record<string, ApiYamlEntity>) ?? {};
  const pagination = raw["pagination"] as Record<string, string> | undefined;

  const hasEnvelope = Object.values(entities).some(
    (e) => e?.list?.response?.envelope || e?.getOne?.response?.envelope,
  );

  const hasEnrichmentTransforms = Object.values(entities).some((e) => {
    const fields = {
      ...(e?.list?.response?.fields ?? {}),
      ...(e?.getOne?.response?.fields ?? {}),
    } as Record<string, { transform?: string }>;
    return Object.values(fields).some(
      (f) => f?.transform && !STANDARD_TRANSFORMS_TS.has(f.transform),
    );
  });

  return {
    apiPath,
    hasEnvelope,
    hasPagination: !!pagination,
    paginationParam: pagination?.["requestParam"] ?? "nextPageToken",
    paginationSizeParam: pagination?.["requestSizeParam"] ?? "pageSize",
    paginationCursorField: pagination?.["responseCursorField"] ?? "nextPageToken",
    hasEnrichmentTransforms,
    entities,
  };
}

/** Extracts `{paramName}` placeholders from a path template as an array of strings. */
function extractPathParams(pathTemplate: string): string[] {
  return (pathTemplate.match(/\{(\w+)\}/g) ?? []).map((m) => m.slice(1, -1));
}

/** Converts `{paramName}` in a path to `${paramName}` for use in a TS template literal. */
function pathToTemplateLiteral(pathTemplate: string): string {
  return pathTemplate.replace(/\{(\w+)\}/g, "${$1}");
}

function singularizeEntity(name: string): string {
  const map: Record<string, string> = { statuses: "status", assignees: "assignee" };
  if (map[name]) return map[name];
  if (name.endsWith("ies")) return name.slice(0, -3) + "y";
  if (name.endsWith("s") && !name.endsWith("ss")) return name.slice(0, -1);
  return name;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Generates the full content of `<className>Adapter.ts` from api.yaml info.
 *
 * Produces real endpoint paths, response envelope unwrapping, and pagination
 * handling. Query param details and payload shapes still need manual work in
 * the types file; those spots are marked with TODO comments.
 */
function genAdapterFromApiYaml(
  info: ApiYamlInfo,
  className: string,
  constantName: string,
  platform: string,
): string {
  const {
    apiPath,
    hasEnvelope,
    hasPagination,
    paginationParam,
    paginationSizeParam,
    paginationCursorField,
    entities,
  } = info;

  const typeImports = new Set<string>();
  const sections: string[] = [];

  for (const [entityName, entity] of Object.entries(entities)) {
    if (!entity) continue;
    const singular = singularizeEntity(entityName);
    const typeName = entity.platformType;
    if (typeName) typeImports.add(typeName);

    const entityEnvelope =
      entity.list?.response?.envelope || entity.getOne?.response?.envelope || null;

    const methodLines: string[] = [];

    // ── LIST ────────────────────────────────────────────────────────────────
    if (entity.list?.path) {
      const listPath = entity.list.path;
      const pathParams = extractPathParams(listPath);
      const pathLit = pathToTemplateLiteral(listPath);
      const methodName = `get${cap(entityName)}`;
      const queryParams = (entity.list.queryParams ?? {}) as Record<string, unknown>;
      const hasQueryParams = Object.keys(queryParams).length > 0;
      // Only treat as paginated when THIS entity's queryParams include the page-size param.
      // This prevents non-paginated endpoints (comments, folders, contacts) from getting a
      // fictitious WrikeCommentsPageResponse return type that doesn't exist in the types file.
      const entityIsPaginated = hasPagination && paginationSizeParam in queryParams;

      /** Emit query param key:value pairs as a compact inline object literal. */
      const buildParamsLiteral = (): string => {
        const entries = Object.entries(queryParams)
          .map(([k, v]) => {
            const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
            const val = typeof v === "string" ? JSON.stringify(v) : String(v);
            return `${key}: ${val}`;
          })
          .join(", ");
        return `{ ${entries} }`;
      };

      if (entityIsPaginated) {
        const pageType = `${className}${cap(entityName)}PageResponse`;
        typeImports.add(pageType);
        const funcParams = [
          "token: PlatformToken",
          ...pathParams.map((p) => `${p}: string`),
          `${paginationParam}?: string`,
        ].join(", ");
        const resType = entityEnvelope
          ? `${className}Envelope<${typeName ?? "unknown"}> & { ${paginationCursorField}?: string }`
          : `{ ${singular}s: ${typeName ?? "unknown"}[]; ${paginationCursorField}?: string }`;
        const dataAccess = entityEnvelope ? "this.unwrap(res.data)" : `res.data.${singular}s`;
        const staticParamLines = Object.entries(queryParams)
          .map(([k, v]) => {
            const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
            const val = typeof v === "string" ? JSON.stringify(v) : String(v);
            return `      ${key}: ${val},`;
          })
          .join("\n");
        methodLines.push(
          `  async ${methodName}(${funcParams}): Promise<${pageType}> {`,
          `    const params: Record<string, unknown> = {`,
          staticParamLines,
          `    };`,
          `    if (${paginationParam}) params[${JSON.stringify(paginationParam)}] = ${paginationParam};`,
          `    const res = await this.client.get<${resType}>(`,
          `      \`${pathLit}\`,`,
          `      { ...this.auth(token), params },`,
          `    );`,
          `    return { ${singular}s: ${dataAccess}, ${paginationCursorField}: res.data.${paginationCursorField} };`,
          `  }`,
        );
      } else {
        const funcParams = ["token: PlatformToken", ...pathParams.map((p) => `${p}: string`)].join(
          ", ",
        );
        const returnType = `${typeName ?? "unknown"}[]`;
        const resType = entityEnvelope
          ? `${className}Envelope<${typeName ?? "unknown"}>`
          : returnType;
        const dataAccess = entityEnvelope ? "this.unwrap(res.data)" : `res.data as ${returnType}`;
        const authArg = hasQueryParams
          ? `{ ...this.auth(token), params: ${buildParamsLiteral()} }`
          : `this.auth(token)`;
        methodLines.push(
          `  async ${methodName}(${funcParams}): Promise<${returnType}> {`,
          `    const res = await this.client.get<${resType}>(`,
          `      \`${pathLit}\`,`,
          `      ${authArg},`,
          `    );`,
          `    return ${dataAccess};`,
          `  }`,
        );
      }
    }

    // ── GET ONE ──────────────────────────────────────────────────────────────
    if (entity.getOne?.path) {
      const getOnePath = entity.getOne.path;
      const pathParams = extractPathParams(getOnePath);
      const pathLit = pathToTemplateLiteral(getOnePath);
      const methodName = `get${cap(singular)}ById`;
      const getOneQueryParams = (entity.getOne.queryParams ?? {}) as Record<string, unknown>;
      const hasGetOneQueryParams = Object.keys(getOneQueryParams).length > 0;
      const funcParams = ["token: PlatformToken", ...pathParams.map((p) => `${p}: string`)].join(
        ", ",
      );
      const getOneEnvelope = entity.getOne?.response?.envelope;
      const resType = getOneEnvelope
        ? `${className}Envelope<${typeName ?? "unknown"}>`
        : `${typeName ?? "unknown"}`;
      const dataAccess = getOneEnvelope
        ? `this.unwrap(res.data)[0]`
        : `res.data as ${typeName ?? "unknown"}`;
      if (hasGetOneQueryParams) {
        const paramsLiteral = Object.entries(getOneQueryParams)
          .map(([k, v]) => {
            const key = /^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(k) ? k : JSON.stringify(k);
            const val = typeof v === "string" ? JSON.stringify(v) : String(v);
            return `${key}: ${val}`;
          })
          .join(", ");
        methodLines.push(
          `  async ${methodName}(${funcParams}): Promise<${typeName ?? "unknown"}> {`,
          `    const res = await this.client.get<${resType}>(`,
          `      \`${pathLit}\`,`,
          `      { ...this.auth(token), params: { ${paramsLiteral} } },`,
          `    );`,
          `    return ${dataAccess};`,
          `  }`,
        );
      } else {
        methodLines.push(
          `  async ${methodName}(${funcParams}): Promise<${typeName ?? "unknown"}> {`,
          `    const res = await this.client.get<${resType}>(\`${pathLit}\`, this.auth(token));`,
          `    return ${dataAccess};`,
          `  }`,
        );
      }
    }

    // ── CREATE ───────────────────────────────────────────────────────────────
    if (entity.create?.path) {
      const createPayloadType = `${className}Create${cap(singular)}Payload`;
      typeImports.add(createPayloadType);
      const createPath = entity.create.path;
      const pathParams = extractPathParams(createPath);
      const pathLit = pathToTemplateLiteral(createPath);
      const methodName = `create${cap(singular)}`;
      const httpMethod = (entity.create.method ?? "POST").toLowerCase();
      // If no path params, the parent reference lives in the payload body
      const params =
        pathParams.length > 0
          ? [
              "token: PlatformToken",
              ...pathParams.map((p) => `${p}: string`),
              `payload: ${createPayloadType}`,
            ].join(", ")
          : `token: PlatformToken, payload: ${createPayloadType}`;
      const resType = entityEnvelope
        ? `${className}Envelope<${typeName ?? "unknown"}>`
        : `${typeName ?? "unknown"}`;
      const dataAccess = entityEnvelope
        ? "this.unwrap(res.data)[0]"
        : `res.data as ${typeName ?? "unknown"}`;
      const pathArg = pathParams.length > 0 ? `\`${pathLit}\`` : `"${createPath}"`;
      methodLines.push(
        `  async ${methodName}(${params}): Promise<${typeName ?? "unknown"}> {`,
        `    const res = await this.client.${httpMethod}<${resType}>(${pathArg}, payload, this.auth(token));`,
        `    return ${dataAccess};`,
        `  }`,
      );
    }

    // ── UPDATE ───────────────────────────────────────────────────────────────
    if (entity.update?.path) {
      const updatePayloadType = `${className}Update${cap(singular)}Payload`;
      typeImports.add(updatePayloadType);
      const updatePath = entity.update.path;
      const pathParams = extractPathParams(updatePath);
      const pathLit = pathToTemplateLiteral(updatePath);
      const methodName = `update${cap(singular)}`;
      const httpMethod = (entity.update.method ?? "PUT").toLowerCase();
      const params = [
        "token: PlatformToken",
        ...pathParams.map((p) => `${p}: string`),
        `payload: ${updatePayloadType}`,
      ].join(", ");
      const resType = entityEnvelope
        ? `${className}Envelope<${typeName ?? "unknown"}>`
        : `${typeName ?? "unknown"}`;
      const dataAccess = entityEnvelope
        ? "this.unwrap(res.data)[0]"
        : `res.data as ${typeName ?? "unknown"}`;
      methodLines.push(
        `  async ${methodName}(${params}): Promise<${typeName ?? "unknown"}> {`,
        `    const res = await this.client.${httpMethod}<${resType}>(\`${pathLit}\`, payload, this.auth(token));`,
        `    return ${dataAccess};`,
        `  }`,
      );
    }

    // ── DELETE ───────────────────────────────────────────────────────────────
    if (entity.delete?.path) {
      const deletePath = entity.delete.path;
      const pathParams = extractPathParams(deletePath);
      const pathLit = pathToTemplateLiteral(deletePath);
      const methodName = `delete${cap(singular)}`;
      const params = ["token: PlatformToken", ...pathParams.map((p) => `${p}: string`)].join(", ");
      methodLines.push(
        `  async ${methodName}(${params}): Promise<void> {`,
        `    await this.client.delete(\`${pathLit}\`, this.auth(token));`,
        `  }`,
      );
    }

    if (methodLines.length > 0) {
      sections.push(
        `  // ── ${cap(entityName)} ${"─".repeat(Math.max(0, 72 - cap(entityName).length))}`,
        "",
        methodLines.filter((l) => l !== "").join("\n"),
      );
    }
  }

  // Always include refreshToken
  sections.push(
    `  // ── Auth ${"─".repeat(65)}`,
    "",
    [
      `  async refreshToken(token: PlatformToken): Promise<PlatformToken> {`,
      `    // TODO: exchange token.refreshToken via the platform's token endpoint`,
      `    void token;`,
      `    throw new Error("${className}Adapter.refreshToken not implemented");`,
      `  }`,
    ].join("\n"),
  );

  const cleanImports = [...typeImports]
    .filter((t) => /^[A-Za-z]\w*$/.test(t))
    .sort()
    .map((t) => `  ${t},`)
    .join("\n");

  const envelopeBlock = hasEnvelope
    ? `\n/** All ${platform} responses wrap results in a { data: T[] } envelope. */\ninterface ${className}Envelope<T> {\n  data: T[];\n}\n`
    : "";

  const unwrapMethod = hasEnvelope
    ? `\n  private unwrap<T>(envelope: ${className}Envelope<T>): T[] {\n    return envelope.data;\n  }\n`
    : "";

  const apiPathComment = apiPath
    ? `// Extracted from capabilities/${platform}.api.yaml → baseUrl.\n// The ${platform}Service.ts normalises platformSite to the host; this segment is appended.`
    : `// TODO: Set the API base path (e.g. "/api/v4"). See capabilities/${platform}.api.yaml → baseUrl.`;

  return `import type { PlatformToken } from "@mp/task-core";
import axios, { type AxiosInstance } from "axios";

import type { ${className}HttpAdapter } from "@/platforms/${platform}/${className}HttpAdapter";
import type {
${cleanImports}
} from "@/types/${platform}";
${envelopeBlock}
${apiPathComment}
const ${constantName}_API_PATH = "${apiPath}";

/**
 * ${className} raw HTTP adapter.
 *
 * Owns all API communication: request construction, auth headers, response
 * unwrapping. Returns platform-native shapes from src/types/${platform}.ts —
 * never @mp/task-core types. Consumed by ${className}ServiceAdapter.
 *
 * Generated from capabilities/${platform}.api.yaml.
 * Review src/types/${platform}.ts and fill in query param details before shipping.
 */
export class ${className}Adapter implements ${className}HttpAdapter {
  private readonly client: AxiosInstance;

  constructor(baseUrl: string) {
    this.client = axios.create({ baseURL: \`\${baseUrl}\${${constantName}_API_PATH}\` });
  }

  private auth(token: PlatformToken) {
    return { headers: { Authorization: \`Bearer \${token.accessToken}\` } };
  }
${unwrapMethod}
${sections.join("\n\n")}
}
`;
}

/**
 * Generates the full content of `<className>HttpAdapter.ts` from api.yaml info.
 * Produces a typed interface that mirrors every method on the concrete adapter.
 */
function genHttpAdapterFromApiYaml(info: ApiYamlInfo, className: string, platform: string): string {
  const { hasPagination, paginationParam, paginationSizeParam, paginationCursorField, entities } =
    info;
  const typeImports = new Set<string>();
  const methodSigs: string[] = [];

  for (const [entityName, entity] of Object.entries(entities)) {
    if (!entity) continue;
    const singular = singularizeEntity(entityName);
    const typeName = entity.platformType;
    if (typeName) typeImports.add(typeName);

    if (entity.list?.path) {
      const pathParams = extractPathParams(entity.list.path);
      const methodName = `get${cap(entityName)}`;
      const listQueryParams = (entity.list.queryParams ?? {}) as Record<string, unknown>;
      const entityIsPaginated = hasPagination && paginationSizeParam in listQueryParams;
      if (entityIsPaginated) {
        const pageType = `${className}${cap(entityName)}PageResponse`;
        typeImports.add(pageType);
        const params = [
          "token: PlatformToken",
          ...pathParams.map((p) => `${p}: string`),
          `${paginationParam}?: string`,
        ].join(", ");
        methodSigs.push(`  ${methodName}(${params}): Promise<${pageType}>;`);
      } else {
        const params = ["token: PlatformToken", ...pathParams.map((p) => `${p}: string`)].join(
          ", ",
        );
        methodSigs.push(`  ${methodName}(${params}): Promise<${typeName ?? "unknown"}[]>;`);
      }
    }
    if (entity.getOne?.path) {
      const pathParams = extractPathParams(entity.getOne.path);
      const params = ["token: PlatformToken", ...pathParams.map((p) => `${p}: string`)].join(", ");
      methodSigs.push(`  get${cap(singular)}ById(${params}): Promise<${typeName ?? "unknown"}>;`);
    }
    if (entity.create?.path) {
      const createPayloadType = `${className}Create${cap(singular)}Payload`;
      typeImports.add(createPayloadType);
      const pathParams = extractPathParams(entity.create.path);
      const params =
        pathParams.length > 0
          ? [
              "token: PlatformToken",
              ...pathParams.map((p) => `${p}: string`),
              `payload: ${createPayloadType}`,
            ].join(", ")
          : `token: PlatformToken, payload: ${createPayloadType}`;
      methodSigs.push(`  create${cap(singular)}(${params}): Promise<${typeName ?? "unknown"}>;`);
    }
    if (entity.update?.path) {
      const updatePayloadType = `${className}Update${cap(singular)}Payload`;
      typeImports.add(updatePayloadType);
      const pathParams = extractPathParams(entity.update.path);
      const params = [
        "token: PlatformToken",
        ...pathParams.map((p) => `${p}: string`),
        `payload: ${updatePayloadType}`,
      ].join(", ");
      methodSigs.push(`  update${cap(singular)}(${params}): Promise<${typeName ?? "unknown"}>;`);
    }
    if (entity.delete?.path) {
      const pathParams = extractPathParams(entity.delete.path);
      const params = ["token: PlatformToken", ...pathParams.map((p) => `${p}: string`)].join(", ");
      methodSigs.push(`  delete${cap(singular)}(${params}): Promise<void>;`);
    }
  }

  // Always include refreshToken
  methodSigs.push(`  refreshToken(token: PlatformToken): Promise<PlatformToken>;`);

  const cleanImports = [...typeImports]
    .filter((t) => /^[A-Za-z]\w*$/.test(t))
    .sort()
    .map((t) => `  ${t},`)
    .join("\n");

  // Suppress unused import warning — paginationCursorField used only in paginated mode
  void paginationCursorField;

  return `import type { PlatformToken } from "@mp/task-core";

import type {
${cleanImports}
} from "@/types/${platform}";

/**
 * ${className} HTTP API contract — generated from capabilities/${platform}.api.yaml.
 * Keep in sync with ${className}Adapter.ts.
 * Replace any remaining stub types in src/types/${platform}.ts before shipping.
 */
export interface ${className}HttpAdapter {
${methodSigs.join("\n")}
}
`;
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
 * Legacy fallback: seed globals.css from Jira for apps that pre-date the globals.css__tmpl__
 * template. New apps get globals.css directly from the template via generateFiles().
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

export default async function generator(tree: Tree, options: PlatformAppGeneratorSchema) {
  const {
    name,
    yamlFile,
    dryRun: dryRunOption = false,
    update = false,
    force = false,
    initialCommit = true,
  } = options;
  /** Nx `nx g ... --dryRun` does not always set `options.dryRun` on the schema; detect the CLI flag too. */
  const dryRun = Boolean(dryRunOption) || isNxCliDryRun();
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

  const apiYamlPath = path.join(tree.root, `capabilities/${projectNames.fileName}.api.yaml`);
  const apiYamlExists = fs.existsSync(apiYamlPath);
  // Parse api.yaml when present — used to generate a real adapter and to pass
  // hasEnrichmentTransforms to the service adapter template.
  const apiYamlInfo = apiYamlExists ? parseApiYamlInfo(apiYamlPath) : null;

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
    // True when capabilities/<name>.api.yaml exists — enables generated normalizer imports.
    hasApiYaml: apiYamlExists,
    // True when api.yaml has fields with non-standard transforms (ID resolution required).
    // Service adapter template uses this to scaffold enrichment helpers.
    hasEnrichmentTransforms: apiYamlInfo?.hasEnrichmentTransforms ?? false,
    offsetFromRoot: offsetFromRoot(projectRoot),
    tmpl: "",
  };

  const capabilitiesProviderPath = `${projectRoot}/src/providers/${projectNames.className}PlatformCapabilitiesProvider.tsx`;

  if (!appExists || force) {
    // First run or forced overwrite: generate everything from templates.
    // globals.css is produced by the globals.css__tmpl__ template (Tailwind v4 config).
    generateFiles(tree, path.join(__dirname, "files"), projectRoot, templateVars);

    // Remove the OAuth auth-failure provider for platforms that don't use OAuth.
    if (!auth || auth.type === "api-key") {
      const authFailurePath = `${projectRoot}/src/providers/auth-providers/${projectNames.className}AuthFailureProvider.tsx`;
      if (tree.exists(authFailurePath)) tree.delete(authFailurePath);
    }

    // Remove the settings panel for platforms that don't have a setup wizard.
    if (!caps.hasSetupWizard) {
      const settingsPanelPath = `${projectRoot}/src/components/connections/${projectNames.className}SettingsPanel.tsx`;
      if (tree.exists(settingsPanelPath)) tree.delete(settingsPanelPath);
    }

    // When api.yaml exists, overwrite the generic template-generated adapter and
    // HttpAdapter with versions that use real endpoint paths, correct API base path,
    // and response envelope unwrapping derived from the YAML.
    // This replaces the "/api/v1" placeholder and generic "/projects" stubs.
    if (apiYamlInfo) {
      const adapterPath = `${projectRoot}/src/platforms/${projectNames.fileName}/${projectNames.className}Adapter.ts`;
      const httpAdapterPath = `${projectRoot}/src/platforms/${projectNames.fileName}/${projectNames.className}HttpAdapter.ts`;
      tree.write(
        adapterPath,
        genAdapterFromApiYaml(
          apiYamlInfo,
          projectNames.className,
          projectNames.constantName,
          projectNames.fileName,
        ),
      );
      tree.write(
        httpAdapterPath,
        genHttpAdapterFromApiYaml(apiYamlInfo, projectNames.className, projectNames.fileName),
      );
      console.log(
        `[platform-app] Generated ${adapterPath} from capabilities/${projectNames.fileName}.api.yaml`,
      );
      console.log(
        `[platform-app] Generated ${httpAdapterPath} from capabilities/${projectNames.fileName}.api.yaml`,
      );
    }
  } else {
    // Update mode: always regenerate the capabilities provider from YAML.
    // All other template files are preserved (developer may have edited them).
    // Seed globals.css from Jira only if this is an old app that pre-dates the template.
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

  writeRouteStub(tree, `${projectRoot}/.env.example`, genEnvExampleFile(platform.name, auth, caps));

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
      genOAuthCallbackRoute(platformSlug, auth),
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
  if (caps.hasSetupWizard) {
    writeRouteStub(tree, `${apiBase}/setup/route.ts`, genSetupRoute(platformSlug));
    writeRouteStub(tree, `${apiBase}/setup/mappings/route.ts`, genSetupMappingsRoute(platformSlug));
    writeRouteStub(tree, `${apiBase}/setup/complete/route.ts`, genSetupCompleteRoute(platformSlug));

    // Platform-local hook re-exports — thin wrappers so imports stay consistent inside the app.
    const hooksBase = `${projectRoot}/src/hooks`;
    writeRouteStub(
      tree,
      `${hooksBase}/useSetup.ts`,
      `export { PLATFORM_SETUP_QUERY_KEY as SETUP_QUERY_KEY, usePlatformSetup as useSetup } from "@mp/ui";\n`,
    );
    writeRouteStub(
      tree,
      `${hooksBase}/useUpsertSetup.ts`,
      `export { useUpsertPlatformSetup as useUpsertSetup } from "@mp/ui";\n`,
    );
    writeRouteStub(
      tree,
      `${hooksBase}/useSetupMappings.ts`,
      `export {\n  PLATFORM_SETUP_MAPPINGS_QUERY_KEY as SETUP_MAPPINGS_QUERY_KEY,\n  usePlatformSetupMappings as useSetupMappings,\n} from "@mp/ui";\n`,
    );
    writeRouteStub(
      tree,
      `${hooksBase}/useUpsertSetupMappings.ts`,
      `export { useUpsertPlatformSetupMappings as useUpsertSetupMappings } from "@mp/ui";\n`,
    );
    writeRouteStub(
      tree,
      `${hooksBase}/useCompleteSetup.ts`,
      `export { useCompletePlatformSetup as useCompleteSetup } from "@mp/ui";\n`,
    );
  }
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
        typecheck: {
          executor: "nx:run-commands",
          inputs: ["default", "{workspaceRoot}/tsconfig.base.json"],
          cache: true,
          options: {
            command: "tsc --noEmit --project tsconfig.json",
            cwd: "{projectRoot}",
          },
        },
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
        "generate-mappings": {
          executor: "nx:run-commands",
          options: {
            command: `node tools/generators/generate-mappings/generateMappings.js --platform ${projectNames.fileName}`,
            cwd: "{workspaceRoot}",
          },
        },
        "validate-mappings": {
          executor: "nx:run-commands",
          options: {
            command: `node tools/generators/generate-mappings/generateMappings.js --platform ${projectNames.fileName} --validate`,
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

  // ── Step 6: Dry-run diff output ─────────────────────────────────────────────
  if (dryRun) {
    await printDiff(tree, projectRoot);
    // Return without calling formatFiles — NX discards the virtual tree on dry-run.
    return;
  }

  await formatFiles(tree);

  // ── Step 7: Auto-run mapping generator if api.yaml exists ──────────────────
  if (fs.existsSync(apiYamlPath)) {
    const mappingGenPath = path.join(
      tree.root,
      "tools/generators/generate-mappings/generateMappings.js",
    );
    if (fs.existsSync(mappingGenPath)) {
      const result = spawnSync("node", [mappingGenPath, "--platform", projectNames.fileName], {
        cwd: tree.root,
        encoding: "utf-8",
        stdio: "inherit",
      });
      if (result.status !== 0) {
        console.warn(
          `[platform-app] generate-mappings exited with code ${result.status ?? "unknown"}. Run manually: npx nx run ${projectNames.fileName}:generate-mappings`,
        );
      }
    }
  }

  if (!appExists && initialCommit) {
    return () => createInitialAppCommit(tree.root, projectRoot, projectNames.fileName);
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

function createInitialAppCommit(workspaceRoot: string, projectRoot: string, projectName: string) {
  const trackedPaths = [projectRoot, "eslint.config.mjs"];
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

  return `import { validateEnv } from "@mp/shared";
import { z } from "zod";

const serverEnvSchema = z.object({
${lines.join("\n")}
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export const env = validateEnv(serverEnvSchema);
`;
}

function genEnvExampleFile(
  platform: string,
  auth: AuthBlock | undefined,
  caps: CapabilityMatrix["capabilities"],
): string {
  const UPPER = platform.toUpperCase().replace(/-/g, "_");
  const pascal = toPascal(platform);
  const lines: string[] = [
    `# ── Supabase ${"─".repeat(75 - 12)}`,
    `NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co`,
    `NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-key>`,
    `SUPABASE_SERVICE_ROLE_KEY=<service-role-key>`,
    ``,
  ];

  if (auth?.type === "oauth2-refresh" || auth?.type === "oauth2-static") {
    lines.push(
      `# ── ${pascal} OAuth ${"─".repeat(75 - pascal.length - 9)}`,
      `${UPPER}_CLIENT_ID=<client-id>`,
      `${UPPER}_CLIENT_SECRET=<client-secret>`,
      `# Must exactly match the callback URL registered in your ${pascal} app`,
      `${UPPER}_REDIRECT_URI=http://localhost:3000/api/auth/${platform}/callback`,
      ``,
      `# ── ${pascal} Webhooks (optional) ${"─".repeat(75 - pascal.length - 22)}`,
      `# Set a secret when registering webhooks with ${pascal}. If absent, signature`,
      `# verification is skipped (acceptable for local dev; required in production).`,
      `# Must be at least 16 characters.`,
      `# ${UPPER}_WEBHOOK_SECRET=<random-secret-min-16-chars>`,
      ``,
    );
  } else if (auth?.type === "oauth1") {
    lines.push(
      `# ── ${pascal} OAuth 1.0a ${"─".repeat(75 - pascal.length - 13)}`,
      `${UPPER}_CONSUMER_KEY=<consumer-key>`,
      `${UPPER}_CONSUMER_SECRET=<consumer-secret>`,
      `${UPPER}_CALLBACK_URL=http://localhost:3000/api/auth/${platform}/callback`,
      ``,
    );
  } else if (auth?.type === "api-key") {
    lines.push(
      `# ── ${pascal} API Key ${"─".repeat(75 - pascal.length - 11)}`,
      `${UPPER}_API_KEY=<api-key>`,
      ``,
    );
  }

  if (caps.hasAiWorkBreakdown) {
    lines.push(
      `# ── AI work breakdown (optional) ${"─".repeat(75 - 33)}`,
      `# Omit to use the built-in stub (no OpenAI call, deterministic output).`,
      `# OPENAI_API_KEY=sk-...`,
      ``,
    );
  }

  lines.push(`# ── App ${"─".repeat(75 - 7)}`, `NEXT_PUBLIC_APP_URL=http://localhost:3000`);

  if (caps.hasAiWorkBreakdown) {
    lines.push(`# Set to "true" to show the AI work-breakdown panel in the UI.`);
    lines.push(`NEXT_PUBLIC_ENABLE_AI_TASK_CREATION=false`);
  }

  return lines.join("\n") + "\n";
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

  return `import crypto from "crypto";
import { type NextRequest, NextResponse } from "next/server";

import { getClientKey, rateLimit } from "@mp/shared";

import { authStrategy } from "@/lib/authStrategy";

/**
 * Initiates the ${toPascal(platform)} OAuth flow.
 * Generates a CSRF state token, stores it in a short-lived cookie, and redirects
 * to the platform's authorization endpoint. The callback route verifies this state.
 */
export async function GET(request: NextRequest) {
  const { allowed, retryAfter } = rateLimit(getClientKey(request), 20, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const state = crypto.randomBytes(32).toString("hex");
  const authorizeUrl = authStrategy.getConnectUrl(state);
  const response = NextResponse.redirect(authorizeUrl);
  response.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 10, // 10 minutes — enough for the user to complete the OAuth flow
  });
  return response;
}
`;
}

/**
 * OAuth callback scaffold. The two TODOs (userId + platformSite) are intentionally
 * left for manual completion — they differ significantly per platform and require
 * careful reading of the platform's API docs. See the Wrike implementation at
 * apps/wrike/src/app/api/auth/wrike/callback/route.ts for a complete reference.
 *
 * Key platform patterns:
 *   userId    — always fetched from the platform's "me" endpoint after token exchange:
 *                 Jira:    GET https://api.atlassian.com/me              → accountId
 *                 Wrike:   GET {host}/api/v4/contacts?me=true            → data[0].id
 *                 Asana:   GET https://app.asana.com/api/1.0/users/me    → data.gid
 *                 Monday:  POST https://api.monday.com/v2 (GraphQL)      → me.id
 *                 Linear:  POST https://api.linear.app/graphql (GraphQL) → viewer.id
 *                 ClickUp: GET https://api.clickup.com/api/v2/user       → user.id
 *
 *   platformSite — static for most platforms; dynamic for a few:
 *                 Wrike:   token response includes \`host\` field (e.g. "app-eu.wrike.com")
 *                          → MUST validate against an allowlist before use (SSRF risk)
 *                 Jira:    call /oauth/token/accessible-resources to discover cloudId
 *                          → store cloudId; reconstruct URL as https://api.atlassian.com/ex/jira/{cloudId}
 *                 All others (Asana, Monday, Linear, ClickUp, Trello): use a fixed constant
 */
function genOAuthCallbackRoute(platform: string, auth: AuthBlock) {
  const UPPER = platform.toUpperCase().replace(/-/g, "_");
  const tokenUrl =
    auth.type === "oauth2-refresh" || auth.type === "oauth2-static"
      ? (auth.oauth2?.tokenUrl ?? `https://TODO_${UPPER}_TOKEN_URL`)
      : `https://TODO_${UPPER}_TOKEN_URL`;

  return `import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { SupabaseTokenStore } from "@mp/token-storage";
import { getClientKey, rateLimit } from "@mp/shared";

import { env } from "@/lib/config";
import { createSupabaseServerClient } from "@/lib/supabaseClient";

const ${UPPER}_TOKEN_URL = "${tokenUrl}";
const ${UPPER}_STORE_CONFIG = {
  connectionsTable: "${platform}_connections",
  sessionsTable: "${platform}_sessions",
  siteColumn: "${platform}_site",
  projectColumn: "${platform}_project",
  accountIdColumn: "${platform}_account_id",
} as const;

function timingSafeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

export async function GET(request: NextRequest) {
  const { allowed, retryAfter } = rateLimit(getClientKey(request), 10, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");

  const cookieState = request.cookies.get("oauth_state")?.value;
  if (!code || !state || !cookieState || !timingSafeCompare(state, cookieState)) {
    return NextResponse.json({ error: "Invalid OAuth state" }, { status: 400 });
  }

  // Exchange code for tokens.
  const tokenRes = await fetch(${UPPER}_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: env.${UPPER}_CLIENT_ID,
      client_secret: env.${UPPER}_CLIENT_SECRET,
      grant_type: "authorization_code",
      code,
      redirect_uri: env.${UPPER}_REDIRECT_URI,
    }).toString(),
  });
  if (!tokenRes.ok) {
    return NextResponse.json({ error: "Token exchange failed" }, { status: 502 });
  }
  const tokenData = (await tokenRes.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    // TODO: add platform-specific token fields if the platform returns them
    //   e.g. Wrike returns \`host\`; Jira does not (cloudId comes from accessible-resources)
  };
  const { access_token, refresh_token, expires_in } = tokenData;
  const expiry = expires_in ? new Date(Date.now() + expires_in * 1000).toISOString() : undefined;

  // TODO: Fetch the platform user profile to get a stable userId.
  // See the JSDoc above this function for per-platform "me" endpoint references.
  // NEVER skip this step — storing tokens without a userId makes them unrecoverable.
  const userId = "TODO_REPLACE_WITH_REAL_USER_ID";

  // TODO: Determine platformSite (the base URL stored alongside the token).
  // For static platforms (Asana, Monday, Linear, ClickUp) use a hardcoded constant.
  // For dynamic platforms (Wrike \`host\`, Jira cloudId) extract from tokenData or a
  // secondary API call, then VALIDATE against an allowlist to prevent SSRF.
  // See apps/wrike/src/app/api/auth/wrike/callback/route.ts for the Wrike pattern.
  const platformSite = "TODO_REPLACE_WITH_PLATFORM_SITE";

  const store = new SupabaseTokenStore(createSupabaseServerClient(), ${UPPER}_STORE_CONFIG);
  await store.saveConnection({
    userId,
    platformSite,
    platformProject: "",
    token: {
      accessToken: access_token,
      refreshToken: refresh_token,
      expiry,
      tokenType: "bearer",
    },
  });

  const sessionToken = crypto.randomBytes(32).toString("hex");
  const sessionExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days
  await store.createSession(userId, sessionToken, sessionExpiry);

  // Redirect to the root page with a signal that tells the OAuth popup to notify
  // the parent window and close. The root page handles ?${platform}=connected.
  const response = NextResponse.redirect(
    new URL("/?${platform}=connected", env.NEXT_PUBLIC_APP_URL ?? request.url),
  );
  response.cookies.delete("oauth_state");
  // secure: true is required for sameSite: "none" — without it browsers demote
  // the cookie to SameSite=Lax and cross-origin iframe requests won't include it.
  response.cookies.set("${platform}_session", sessionToken, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    expires: sessionExpiry,
  });
  return response;
}
`;
}

function genRefreshRoute(platform: string) {
  return `import { type NextRequest, NextResponse } from "next/server";

import { rateLimit } from "@mp/shared";

import { get${toPascal(platform)}UserIdFromSession } from "@/helpers/${platform}UserId";
import { authStrategy } from "@/lib/authStrategy";

export async function POST(request: NextRequest) {
  const userId = await get${toPascal(platform)}UserIdFromSession(request);
  if (!userId) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const limitKey = \`refresh:\${userId}\`;
  const { allowed, retryAfter } = rateLimit(limitKey, 30, 60_000);
  if (!allowed) {
    return NextResponse.json(
      { error: "Too many requests. Please try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

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

import { withAdapter } from "@/lib/platformRoute";

export async function GET(request: NextRequest) {
  const siteId = request.nextUrl.searchParams.get("siteId")?.trim() || undefined;
  return withAdapter(request, (adapter) => adapter.getProjects(siteId), { emptyOnNoAuth: true });
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

function genSetupRoute(platform: string) {
  return `import type { PlatformSetupResponse, UpsertPlatformSetupPayload } from "@mp/task-core";
import { NextRequest, NextResponse } from "next/server";

// TODO: Import your platform's auth helpers and setup service functions:
// import { get${cap(platform)}UserIdFromSession, clearSession } from "@/helpers/${platform}UserId";
// import { getUserSetup, getUserSetupMappings, upsertUserSetup, hasUserConnection, getUserConnection } from "@/services/${platform}Service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // TODO: Resolve the current user from the session.
    // const userId = await get${cap(platform)}UserIdFromSession(request);
    // if (!userId) return NextResponse.json<PlatformSetupResponse>({ connected: false, setup: null, mappings: [] });

    // const connected = await hasUserConnection(userId);
    // if (!connected) return NextResponse.json<PlatformSetupResponse>({ connected: false, setup: null, mappings: [] });

    // const [setup, mappings] = await Promise.all([getUserSetup(userId), getUserSetupMappings(userId)]);
    // return NextResponse.json<PlatformSetupResponse>({ connected: true, setup, mappings });

    return NextResponse.json<PlatformSetupResponse>({ connected: false, setup: null, mappings: [] });
  } catch (error) {
    console.error("Failed to fetch setup:", error);
    return NextResponse.json({ error: "Failed to fetch setup." }, { status: 500 });
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // TODO: Resolve the current user from the session.
    // const userId = await get${cap(platform)}UserIdFromSession(request);
    // if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    let body: UpsertPlatformSetupPayload;
    try {
      body = (await request.json()) as UpsertPlatformSetupPayload;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    const { siteId, siteUrl, defaultProjectId, defaultProjectKey } = body;
    if (!siteId || !siteUrl || !defaultProjectId || !defaultProjectKey) {
      return NextResponse.json(
        { error: "Missing required fields: siteId, siteUrl, defaultProjectId, defaultProjectKey." },
        { status: 400 },
      );
    }

    // TODO: Wire to your platform's service:
    // const connection = await getUserConnection(userId);
    // const setup = await upsertUserSetup(userId, connection.connectionId, body);
    // return NextResponse.json(setup, { status: 200 });

    return NextResponse.json({ error: "Not implemented." }, { status: 501 });
  } catch (error) {
    console.error("Failed to save setup:", error);
    return NextResponse.json({ error: "Failed to save setup." }, { status: 500 });
  }
}
`;
}

function genSetupMappingsRoute(platform: string) {
  return `import type { UpsertPlatformSetupMappingsPayload } from "@mp/task-core";
import { NextRequest, NextResponse } from "next/server";

// TODO: Import your platform's auth helpers and setup mappings service functions:
// import { get${cap(platform)}UserIdFromSession } from "@/helpers/${platform}UserId";
// import { getUserConnection, getUserSetupMappings, upsertUserSetupMappings } from "@/services/${platform}Service";

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // TODO: Resolve user, fetch and return mappings:
    // const userId = await get${cap(platform)}UserIdFromSession(request);
    // if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
    // const mappings = await getUserSetupMappings(userId);
    // return NextResponse.json(mappings);

    return NextResponse.json([]);
  } catch (error) {
    console.error("Failed to fetch setup mappings:", error);
    return NextResponse.json({ error: "Failed to fetch setup mappings." }, { status: 500 });
  }
}

export async function PUT(request: NextRequest): Promise<NextResponse> {
  try {
    // TODO: Resolve user:
    // const userId = await get${cap(platform)}UserIdFromSession(request);
    // if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    let body: UpsertPlatformSetupMappingsPayload;
    try {
      body = (await request.json()) as UpsertPlatformSetupMappingsPayload;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }

    if (!Array.isArray(body?.mappings)) {
      return NextResponse.json({ error: "Body must contain a 'mappings' array." }, { status: 400 });
    }

    for (const m of body.mappings) {
      if (!m.externalResourceId || !m.projectId || !m.projectKey) {
        return NextResponse.json(
          { error: "Each mapping must include externalResourceId, projectId, and projectKey." },
          { status: 400 },
        );
      }
    }

    // TODO: Wire to your platform's service:
    // const connection = await getUserConnection(userId);
    // const mappings = await upsertUserSetupMappings(userId, connection.connectionId, body.mappings);
    // return NextResponse.json(mappings);

    return NextResponse.json({ error: "Not implemented." }, { status: 501 });
  } catch (error) {
    console.error("Failed to update setup mappings:", error);
    return NextResponse.json({ error: "Failed to update setup mappings." }, { status: 500 });
  }
}
`;
}

function genSetupCompleteRoute(platform: string) {
  return `import { NextRequest, NextResponse } from "next/server";

// TODO: Import your platform's auth helpers and setup service functions:
// import { get${cap(platform)}UserIdFromSession } from "@/helpers/${platform}UserId";
// import { completeUserSetup, getUserSetup } from "@/services/${platform}Service";

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // TODO: Resolve user, verify setup exists, then stamp setup_completed_at:
    // const userId = await get${cap(platform)}UserIdFromSession(request);
    // if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

    // const setup = await getUserSetup(userId);
    // if (!setup) {
    //   return NextResponse.json(
    //     { error: "Setup record not found. Complete setup configuration first." },
    //     { status: 404 },
    //   );
    // }

    // await completeUserSetup(userId);
    // return NextResponse.json({ success: true });

    return NextResponse.json({ error: "Not implemented." }, { status: 501 });
  } catch (error) {
    console.error("Failed to complete setup:", error);
    return NextResponse.json({ error: "Failed to complete setup." }, { status: 500 });
  }
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
  return `import { NextRequest } from "next/server";

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
