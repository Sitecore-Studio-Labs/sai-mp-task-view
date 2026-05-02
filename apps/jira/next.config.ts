import path from "node:path";

import type { NextConfig } from "next";

import { buildShadowAliases } from "../../tools/shadow-utils";
import { UiShadowResolverPlugin } from "../../tools/webpack-plugins/UiShadowResolverPlugin";

const overridesDir = path.resolve(__dirname, "src");

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
