import fs from "node:fs";
import path from "node:path";

import type { NextConfig } from "next";

import { UiShadowResolverPlugin } from "../../tools/webpack-plugins/UiShadowResolverPlugin";

const overridesDir = path.resolve(__dirname, "src");

/**
 * Scans overridesDir at config-load time and returns a Turbopack resolveAlias
 * map for every override file found. New override files require a dev-server
 * restart (Turbopack resolves aliases statically). The webpack path uses a
 * dynamic resolver plugin that picks up new files without a restart.
 */
function buildShadowAliases(
  dir: string,
  libAlias: string,
  projectRoot: string,
): Record<string, string> {
  const aliases: Record<string, string> = {};
  if (!fs.existsSync(dir)) return aliases;

  const scan = (current: string) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        scan(fullPath);
      } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
        const rel = path.relative(dir, fullPath).replace(/\\/g, "/");
        const subpath = rel.replace(/\.(tsx?|jsx?)$/, "");
        // Turbopack resolves alias values relative to the Next.js project root
        // (apps/jira). Using a project-relative path keeps the file inside the
        // app's compilation context and avoids the "external module" error that
        // absolute paths trigger when crossing the transpile-package boundary.
        const projectRelPath = "./" + path.relative(projectRoot, fullPath).replace(/\\/g, "/");
        aliases[`${libAlias}/${subpath}`] = projectRelPath;
      }
    }
  };

  scan(dir);
  return aliases;
}

const nextConfig: NextConfig = {
  images: {
    dangerouslyAllowSVG: true,
    remotePatterns: [
      {
        protocol: "https",
        hostname: "api.atlassian.com",
      },
      {
        protocol: "https",
        hostname: "*.atlassian.net",
      },
      {
        protocol: "https",
        hostname: "secure.gravatar.com",
      },
      {
        protocol: "https",
        hostname: "avatar-management--avatars.us-west-2.prod.public.atl-paas.net",
      },
    ],
  },
  // Workspace packages with React / "use client" — ensure Next compiles them.
  transpilePackages: ["@mp/ui", "@mp/task-core", "@mp/shared", "@mp/ai"],
  // Turbopack (default in Next 16): aliases are resolved once at startup by
  // scanning the overrides dir. Adding a new override file needs a dev-server restart.
  turbopack: {
    resolveAlias: buildShadowAliases(overridesDir, "@mp/ui", __dirname),
  },
  // Webpack (--webpack flag): dynamic resolver plugin checks file existence
  // per-request, so new override files are picked up without a restart.
  webpack(config) {
    config.resolve.plugins ??= [];
    config.resolve.plugins.push(new UiShadowResolverPlugin({ overridesDir }));
    return config;
  },
};

export default nextConfig;
