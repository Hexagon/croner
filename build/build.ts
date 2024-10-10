import esbuild from "esbuild";
import { dtsPlugin } from "esbuild-plugin-d.ts";
import { dirname, fromFileUrl, resolve } from "@std/path";
import { cp, isDir, isFile, readFile, rm, rmdir, writeFile } from "@cross/fs";

const baseRelativeProjectRoot = "../"; // Where is this script located relative to the project root
const outputFolder = "dist";
const currentScriptDir = dirname(fromFileUrl(import.meta.url));
const relativeProjectRoot = resolve(currentScriptDir, baseRelativeProjectRoot);
const resolvedDistPath = resolve(relativeProjectRoot, outputFolder);
const resolvedNodeModulesPath = resolve(relativeProjectRoot, "node_modules");
const resolvedPackageJsonPath = resolve(relativeProjectRoot, "package.json");
const resolvedDenoConfigPath = resolve(relativeProjectRoot, "deno.json");

/* - Base esbuild configuration */
const baseConfig = {
  entryPoints: [resolve(relativeProjectRoot, "src", "croner.ts")],
  bundle: true,
  minify: true,
  sourcemap: false,
};

/* - All esbuild targets */
const buildConfigs = [
  {
    ...baseConfig,
    outfile: resolve(resolvedDistPath, "croner.cjs"),
    platform: "node",
    format: "cjs",
  },
  {
    ...baseConfig,
    outfile: resolve(resolvedDistPath, "croner.umd.js"),
    platform: "browser",
    format: "iife",
    globalName: "Cron",
  },
  {
    ...baseConfig,
    outdir: resolvedDistPath,
    platform: "neutral",
    format: "esm",
    plugins: [dtsPlugin({
      experimentalBundling: true,
    })],
  },
];

/* Base package.json (name and version will be transfered from deno.json) */
const basePackageJson = {
  "description":
    "Trigger functions and/or evaluate cron expressions in JavaScript. No dependencies. Most features. All environments.",
  "author": "Hexagon <github.com/hexagon>",
  "homepage": "https://croner.56k.guru",
  "contributors": [
    {
      "name": "Pehr Boman",
      "email": "github.com/unkelpehr",
    },
  ],
  "repository": {
    "type": "git",
    "url": "https://github.com/hexagon/croner",
  },
  "bugs": {
    "url": "https://github.com/hexagon/croner/issues",
  },
  "files": [
    "dist/*.js",
    "dist/*.cjs",
    "dist/*.d.ts",
    "dist/*.d.cts",
  ],
  "engines": {
    "node": ">=18.0",
  },
  "keywords": [
    "cron",
    "front-end",
    "backend",
    "parser",
    "croner",
    "schedule",
    "scheduler",
    "timer",
    "task",
    "job",
    "isomorphic",
    "crontab",
  ],
  "type": "module",
  "main": "./dist/croner.cjs",
  "browser": "./dist/croner.umd.js",
  "module": "./dist/croner.js",
  "types": "./dist/croner.d.ts",
  "exports": {
    "./package.json": "./package.json",
    ".": {
      "import": {
        "types": "./dist/croner.d.ts",
        "default": "./dist/croner.js",
      },
      "require": {
        "types": "./dist/croner.d.cts",
        "default": "./dist/croner.cjs",
      },
      "browser": "./dist/croner.umd.js",
    },
  },
  "license": "MIT",
};

async function clean() {
  if (await isDir(resolvedDistPath)) {
    await rmdir(resolvedDistPath, {
      recursive: true,
    });
  }
  if (await isDir(resolvedNodeModulesPath)) {
    await rmdir(resolvedNodeModulesPath, {
      recursive: true,
    });
  }
  if (await isFile(resolvedPackageJsonPath)) {
    await rm(resolvedPackageJsonPath);
  }
}

// Function to build with esbuild
async function build() {
  try {
    //@ts-ignore No need to worry about config errors
    await Promise.all(buildConfigs.map((config) => esbuild.build(config)));
    // Copy .d.ts to .d.cts
    await cp(resolve(resolvedDistPath, "croner.d.ts"), resolve(resolvedDistPath, "croner.d.cts"));
  } catch (error) {
    console.error("Build failed:", error);
  }
}

async function generatePackageJson() {
  // Read deno.json
  const denoConfig = JSON.parse(
    new TextDecoder().decode(await readFile(resolvedDenoConfigPath)),
  ) as { name: string; version: string };

  // Define package.json template
  const packageJson = {
    ...basePackageJson,
    name: "croner",
    version: denoConfig.version,
  };

  // Write package.json
  await writeFile(
    resolvedPackageJsonPath,
    new TextEncoder().encode(JSON.stringify(packageJson, undefined, 2)),
  );

  console.log("package.json has been generated successfully.");
}

if (Deno.args[1] === "clean") {
  await clean();
} else if (Deno.args[1] === "build") {
  await build();
} else if (Deno.args[1] === "package") {
  await generatePackageJson();
}
