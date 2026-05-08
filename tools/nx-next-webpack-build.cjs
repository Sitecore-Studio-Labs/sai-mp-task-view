/* eslint-disable @typescript-eslint/no-require-imports */
"use strict";

/**
 * Next 16 defaults `next build` to Turbopack; our apps use webpack-only
 * `UiShadowResolverPlugin`. Nx's `@nx/next:build` does not pass `--webpack`,
 * which can surface as WorkerError / unstable builds. This script mirrors
 * `@nx/next` production build packaging while forcing webpack.
 *
 * Usage (from workspace root):
 *   node tools/nx-next-webpack-build.cjs <projectName> <outputPathRelative>
 */

const { fork } = require("child_process");
const path = require("node:path");
const fs = require("node:fs");
const fsp = require("node:fs/promises");
const semver = require("semver");
const { checkAndCleanWithSemver } = require("@nx/devkit/src/utils/semver");
const {
  workspaceRoot,
  createProjectGraphAsync,
  readJsonFile,
  writeJsonFile,
  logger,
  detectPackageManager,
} = require("@nx/devkit");
const { createPackageJson, createLockFile, getLockFileName } = require("@nx/js");
const { signalToCode } = require("nx/src/utils/exit-codes");

const nxNextRoot = path.dirname(require.resolve("@nx/next/package.json"));
const { updatePackageJson } = require(
  path.join(nxNextRoot, "src/executors/build/lib/update-package-json.js"),
);
const { createNextConfigFile } = require(
  path.join(nxNextRoot, "src/executors/build/lib/create-next-config-file.js"),
);
const { checkPublicDirectory } = require(
  path.join(nxNextRoot, "src/executors/build/lib/check-project.js"),
);
const { createCliOptions } = require(path.join(nxNextRoot, "src/utils/create-cli-options.js"));

function runCliBuild(projectRootAbs, options) {
  const { experimentalAppOnly, experimentalBuildMode, profile, debug, outputPath } = options;
  process.env.NX_NEXT_OUTPUT_PATH ??= outputPath;
  const args = createCliOptions({
    experimentalAppOnly,
    experimentalBuildMode,
    profile,
    debug,
  });

  return new Promise((resolve, reject) => {
    const childProcess = fork(
      require.resolve("next/dist/bin/next"),
      ["build", "--webpack", ...args],
      {
        cwd: projectRootAbs,
        stdio: ["ignore", "inherit", "inherit", "ipc"],
        env: process.env,
      },
    );

    const onParentExit = () => childProcess.kill();
    process.on("exit", onParentExit);
    process.on("SIGTERM", (signal) => {
      reject({ code: signalToCode(signal), signal });
    });
    process.on("SIGINT", (signal) => {
      reject({ code: signalToCode(signal), signal });
    });

    childProcess.on("error", (err) => {
      reject({ error: err });
    });
    childProcess.on("exit", (code, signal) => {
      process.off("exit", onParentExit);
      if (code === 0) {
        resolve({ code, signal });
      } else {
        reject({ code, signal });
      }
    });
  });
}

async function main() {
  const projectName = process.argv[2];
  const outputPathRel = process.argv[3];
  if (!projectName || !outputPathRel) {
    console.error(
      "Usage: node tools/nx-next-webpack-build.cjs <projectName> <outputPathRelativeToWorkspace>",
    );
    process.exit(1);
  }

  process.env.NODE_ENV ||= "production";

  const graph = await createProjectGraphAsync();
  const node = graph.nodes[projectName];
  if (!node) {
    console.error(`Unknown project: ${projectName}`);
    process.exit(1);
  }

  const projectRoot = node.data.root;
  const projectRootAbs = path.resolve(workspaceRoot, projectRoot);
  checkPublicDirectory(projectRootAbs);

  const packageJsonPath = path.join(projectRootAbs, "package.json");
  const packageJson = fs.existsSync(packageJsonPath) ? readJsonFile(packageJsonPath) : undefined;
  const rootPackageJson = readJsonFile(path.join(workspaceRoot, "package.json"));
  const reactDomVersion =
    packageJson?.dependencies?.["react-dom"] ?? rootPackageJson.dependencies?.["react-dom"];
  const hasReact18 =
    reactDomVersion && semver.gte(checkAndCleanWithSemver("react-dom", reactDomVersion), "18.0.0");
  if (hasReact18) {
    process.env.__NEXT_REACT_ROOT ||= "true";
  }

  const options = {
    outputPath: outputPathRel.replace(/\/$/, ""),
    experimentalAppOnly: undefined,
    experimentalBuildMode: undefined,
    profile: undefined,
    debug: undefined,
    includeDevDependenciesInPackageJson: false,
    generateLockfile: false,
    skipOverrides: undefined,
    skipPackageManager: undefined,
  };

  const context = {
    root: workspaceRoot,
    projectName,
    projectGraph: graph,
    targetName: "build",
  };

  try {
    await runCliBuild(projectRootAbs, options);
  } catch ({ error, code, signal }) {
    if (code || signal) {
      logger.error(
        `Build process exited due to ${code ? "code " + code : ""} ${code && signal ? "and" : ""} ${signal ? "signal " + signal : ""}`,
      );
    } else {
      logger.error("Error occurred while trying to run the build command");
      logger.error(error);
    }
    process.exit(1);
  }

  await fsp.mkdir(options.outputPath, { recursive: true });
  const builtPackageJson = createPackageJson(context.projectName, context.projectGraph, {
    target: context.targetName,
    root: context.root,
    isProduction: !options.includeDevDependenciesInPackageJson,
    skipOverrides: options.skipOverrides,
    skipPackageManager: options.skipPackageManager,
  });
  builtPackageJson.scripts = { start: "next start" };
  updatePackageJson(builtPackageJson, context);
  writeJsonFile(`${options.outputPath}/package.json`, builtPackageJson);

  if (options.generateLockfile) {
    const packageManager = detectPackageManager(context.root);
    const lockFile = createLockFile(builtPackageJson, context.projectGraph, packageManager);
    fs.writeFileSync(`${options.outputPath}/${getLockFileName(packageManager)}`, lockFile, {
      encoding: "utf-8",
    });
  }

  if (options.outputPath !== projectRoot) {
    createNextConfigFile(options, context);
    const publicSrc = path.join(projectRootAbs, "public");
    if (fs.existsSync(publicSrc)) {
      fs.cpSync(publicSrc, path.join(workspaceRoot, options.outputPath, "public"), {
        dereference: true,
        recursive: true,
      });
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
