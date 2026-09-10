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

// CORS_ALLOWED_ORIGIN is the embedding host (e.g. the SAi/Sitecore XM Cloud domain).
// Set this in Vercel environment variables for production.
// Omitting it falls back to the wildcard "*" — acceptable for dev, not recommended for prod.
const corsAllowedOrigin = process.env.CORS_ALLOWED_ORIGIN ?? "*";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async headers() {
    return [
      {
        // Apply to all API routes so the embedded iframe can make fetch requests.
        source: "/api/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: corsAllowedOrigin },
          { key: "Access-Control-Allow-Methods", value: "GET,POST,PUT,PATCH,DELETE,OPTIONS" },
          { key: "Access-Control-Allow-Headers", value: "Content-Type, Authorization" },
          { key: "Access-Control-Allow-Credentials", value: "true" },
        ],
      },
    ];
  },
  transpilePackages: [
    "@mp/ui",
    "@mp/task-core",
    "@mp/shared",
    "@mp/ai",
    "@mp/auth",
    "@mp/db",
    "@mp/observability",
  ],
  serverExternalPackages: ["pg", "pg-native"],
  turbopack: {
    resolveAlias: buildUiShadowTurboAliases(overridesDir, libUiSrc, __dirname),
  },
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
