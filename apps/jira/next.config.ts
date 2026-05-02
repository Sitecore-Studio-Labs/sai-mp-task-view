import path from "node:path";

import type { NextConfig } from "next";

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
