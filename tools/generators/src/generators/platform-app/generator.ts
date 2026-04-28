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

interface CapabilityMatrix {
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
    hasOAuth?: boolean;
  };
}

export default async function generator(tree: Tree, options: PlatformAppGeneratorSchema) {
  const { name, yamlFile } = options;
  const projectNames = names(name);
  const projectRoot = `apps/${projectNames.fileName}`;

  // ── 1. Parse capability YAML ────────────────────────────────────────────
  const yamlPath = path.join(tree.root, yamlFile);
  if (!fs.existsSync(yamlPath)) {
    throw new Error(`Capability YAML not found: ${yamlPath}`);
  }
  const rawYaml = fs.readFileSync(yamlPath, "utf-8");
  const matrix = yaml.load(rawYaml) as CapabilityMatrix;
  const caps = matrix.capabilities;
  const platform = matrix.platform;

  // ── 2. Generate static scaffold files from EJS templates ────────────────
  const templateVars = {
    name: projectNames.fileName,
    className: projectNames.className,
    constantName: projectNames.constantName,
    platform: platform.name,
    platformDisplay: platform.displayName,
    connectionTitle: platform.connectionTitle ?? `Connect to ${platform.displayName}`,
    connectionDescription:
      platform.connectionDescription ??
      `Link your ${platform.displayName} account to manage tasks.`,
    ...caps,
    offsetFromRoot: offsetFromRoot(projectRoot),
    tmpl: "",
  };

  generateFiles(tree, path.join(__dirname, "files"), projectRoot, templateVars);

  // ── 3. Write conditional API route stubs ────────────────────────────────
  const apiBase = `${projectRoot}/src/app/api`;
  const platformSlug = platform.name;

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
    genConnectRoute(platformSlug),
  );

  if (caps.hasOAuth) {
    writeRouteStub(
      tree,
      `${apiBase}/auth/${platformSlug}/callback/route.ts`,
      genOAuthCallbackRoute(platformSlug),
    );
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

  // ── 4. Register Nx project ───────────────────────────────────────────────
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
        options: { buildTarget: `${projectNames.fileName}:build`, dev: true },
      },
      lint: { executor: "@nx/eslint:lint" },
      test: { executor: "@nx/vite:test" },
    },
    tags: [`scope:${projectNames.fileName}`, "type:app"],
  });

  await formatFiles(tree);
}

// ── helpers ──────────────────────────────────────────────────────────────

function writeRouteStub(tree: Tree, filePath: string, content: string) {
  if (!tree.exists(filePath)) {
    tree.write(filePath, content);
  }
}

// ── route stub generators ─────────────────────────────────────────────────

function genAuthStatusRoute(platform: string) {
  return `import { NextResponse } from "next/server";

// TODO: Check whether the current user has an active ${platform} connection.
export async function GET() {
  return NextResponse.json({ connected: false });
}
`;
}

function genDisconnectRoute(platform: string) {
  return `import { NextResponse } from "next/server";

// TODO: Revoke ${platform} tokens and clear the stored credentials.
export async function POST() {
  return NextResponse.json({ ok: true });
}
`;
}

function genConnectRoute(platform: string) {
  return `import { NextResponse } from "next/server";

// TODO: Initiate the ${platform} connection (e.g. redirect to OAuth or accept API key).
export async function GET() {
  return NextResponse.redirect("https://example.com/oauth/authorize");
}
`;
}

function genOAuthCallbackRoute(platform: string) {
  return `import { NextResponse } from "next/server";

// TODO: Handle the OAuth callback from ${platform}, exchange code for tokens.
export async function GET() {
  return NextResponse.json({ ok: true });
}
`;
}

function genRefreshRoute(platform: string) {
  return `import { NextResponse } from "next/server";

// TODO: Use the stored refresh token to obtain a new access token from ${platform}.
export async function POST() {
  return NextResponse.json({ accessToken: "", refreshToken: "", expiry: "", tokenType: "bearer" });
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
  const { siteId } = await req.json() as { siteId: string };
  void siteId;
  return NextResponse.json({ ok: true });
}
`;
}

function genProjectsRoute(platform: string) {
  return `import { NextResponse } from "next/server";

// TODO: Return ${platform} projects accessible to the current user.
export async function GET() {
  return NextResponse.json([]);
}
`;
}

function genSelectProjectRoute(platform: string) {
  return `import { NextRequest, NextResponse } from "next/server";

// TODO: Persist the user's selected ${platform} project.
export async function POST(req: NextRequest) {
  const { projectKey } = await req.json() as { projectKey: string };
  void projectKey;
  return NextResponse.json({ ok: true });
}
`;
}

function genIssuesRoute(platform: string) {
  return `import { NextRequest, NextResponse } from "next/server";

// TODO: Return a paginated list of ${platform} issues for the given project.
export async function GET(req: NextRequest) {
  void req;
  return NextResponse.json({ issues: [], isLast: true });
}
`;
}

function genIssueRoute(platform: string) {
  return `import { NextRequest, NextResponse } from "next/server";

// TODO: GET a single ${platform} issue; PUT/PATCH to update it.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ issueIdOrKey: string }> },
) {
  const { issueIdOrKey } = await params;
  void issueIdOrKey;
  return NextResponse.json({});
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ issueIdOrKey: string }> },
) {
  const { issueIdOrKey } = await params;
  void issueIdOrKey;
  void req;
  return NextResponse.json({ ok: true });
}
`;
}

function genTransitionsRoute(platform: string) {
  return `import { NextRequest, NextResponse } from "next/server";

// TODO: GET available ${platform} status transitions; POST to apply one.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ issueIdOrKey: string }> },
) {
  const { issueIdOrKey } = await params;
  void issueIdOrKey;
  return NextResponse.json({ transitions: [] });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ issueIdOrKey: string }> },
) {
  const { issueIdOrKey } = await params;
  const { transitionId } = await req.json() as { transitionId: string };
  void issueIdOrKey;
  void transitionId;
  return NextResponse.json({ ok: true });
}
`;
}

function genIssueTypesRoute(platform: string) {
  return `import { NextResponse } from "next/server";

// TODO: Return issue types available in the selected ${platform} project.
export async function GET() {
  return NextResponse.json([]);
}
`;
}

function genPrioritiesRoute(platform: string) {
  return `import { NextRequest, NextResponse } from "next/server";

// TODO: Return priorities for the given ${platform} project.
export async function GET(req: NextRequest) {
  void req;
  return NextResponse.json([]);
}
`;
}

function genAssigneesRoute(platform: string) {
  return `import { NextRequest, NextResponse } from "next/server";

// TODO: Return assignable users for the given ${platform} project.
export async function GET(req: NextRequest) {
  void req;
  return NextResponse.json([]);
}
`;
}

function genCurrentUserRoute(platform: string) {
  return `import { NextResponse } from "next/server";

// TODO: Return the currently authenticated ${platform} user.
export async function GET() {
  return NextResponse.json({});
}
`;
}

function genStatusesRoute(platform: string) {
  return `import { NextRequest, NextResponse } from "next/server";

// TODO: Return statuses for the given ${platform} project key.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ projectKey: string }> },
) {
  const { projectKey } = await params;
  void projectKey;
  return NextResponse.json([]);
}
`;
}

function genCommentsRoute(platform: string) {
  return `import { NextRequest, NextResponse } from "next/server";

// TODO: GET ${platform} issue comments; POST to add a comment.
export async function GET(req: NextRequest) {
  void req;
  return NextResponse.json({ startAt: 0, maxResults: 0, total: 0, comments: [] });
}

export async function POST(req: NextRequest) {
  void req;
  return NextResponse.json({ ok: true });
}
`;
}

function genPermissionsRoute(platform: string) {
  return `import { NextRequest, NextResponse } from "next/server";

// TODO: Check whether the current user has the requested ${platform} permission.
export async function GET(req: NextRequest) {
  void req;
  return NextResponse.json({ hasPermission: true });
}
`;
}

function genAttachmentRoute(platform: string) {
  return `import { NextRequest, NextResponse } from "next/server";

// TODO: Stream or return a ${platform} attachment by ID.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;
  void attachmentId;
  return NextResponse.json({});
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ attachmentId: string }> },
) {
  const { attachmentId } = await params;
  void attachmentId;
  return NextResponse.json({ ok: true });
}
`;
}
