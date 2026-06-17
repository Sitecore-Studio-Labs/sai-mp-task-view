import path from "node:path";

import type { NextConfig } from "next";

import { UiShadowResolverPlugin } from "../../tools/webpack-plugins/UiShadowResolverPlugin";

const overridesDir = path.resolve(__dirname, "src");
const libUiSrc = path.resolve(__dirname, "../../libs/ui/src");

const { buildUiShadowTurboAliases } =
  require("../../tools/webpack-plugins/buildUiShadowTurboAliases.js") as {
    buildUiShadowTurboAliases: (
      overridesDir: string,
      libSrc: string,
      configDir: string,
    ) => Record<string, string>;
  };

const nextConfig: NextConfig = {
  // Playwright CI uses http://127.0.0.1:3000; Next.js 16 blocks dev HMR/chunks cross-origin without this.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
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
  transpilePackages: [
    "@mp/ui",
    "@mp/task-core",
    "@mp/shared",
    "@mp/ai",
    "@mp/auth",
    "@mp/observability",
  ],
  // Next 16 defaults to Turbopack; webpack plugins are ignored unless `next dev/build --webpack`.
  // Mirror shadow overrides into Turbopack so app-level @mp/ui/* files win here too.
  turbopack: {
    resolveAlias: buildUiShadowTurboAliases(overridesDir, libUiSrc, __dirname),
  },
  // UiShadowResolverPlugin runs on described-resolve before JsConfigPathsPlugin
  // (unshift) so overrides become the real module path — fixes HMR on shadow edits.
  // resolve.unsafeCache is disabled in dev so @mp/ui resolutions from libs/ui
  // do not stick to a stale libs path after you add or change an override.
  webpack(config, { dev }) {
    if (dev) {
      config.resolve.unsafeCache = false;
    }
    config.resolve.plugins ??= [];
    config.resolve.plugins.unshift(new UiShadowResolverPlugin({ overridesDir }));
    return config;
  },
};

export default nextConfig;
