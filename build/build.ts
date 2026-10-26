/**
 * Build script for croner (Node.js).
 *
 * Usage: tsx build/build.ts <command>
 *
 * Commands:
 *   clean          Remove build artifacts (dist)
 *   build          Transpile src/ to dist/ (cjs, esm, umd) and generate typings
 *   sync-version   Copy the version from package.json to deno.json (JSR)
 *   check-version  Fail if package.json and deno.json versions differ
 */
import type { BuildOptions } from "esbuild";
import { copyFile, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import process from "node:process";

/**
 * Build helpers
 */
export async function build(
  baseConfig: BuildOptions,
  configs?: BuildOptions[],
): Promise<void> {
  const { default: esbuild } = await import("esbuild");
  const buildConfigs = configs?.map((config) => ({ ...baseConfig, ...config })) || [baseConfig];
  try {
    await Promise.all(buildConfigs.map((config) => esbuild.build(config)));
    console.log("All builds completed successfully.");
  } catch (error) {
    console.error("Build failed:", error);
    throw error;
  }
}

async function readJson<T>(filePath: string): Promise<T> {
  return JSON.parse(await readFile(filePath, "utf8")) as T;
}

/**
 * Now the actual build script
 */

/* Preparations - Work out paths */
const baseRelativeProjectRoot = "../"; // Where is this script located relative to the project root
const currentScriptDir = dirname(fileURLToPath(import.meta.url));
const relativeProjectRoot = resolve(currentScriptDir, baseRelativeProjectRoot);
const resolvedDistPath = resolve(relativeProjectRoot, "dist");
const packageJsonPath = resolve(relativeProjectRoot, "package.json");
const denoJsonPath = resolve(relativeProjectRoot, "deno.json");

const command = process.argv[2];

/* Handle argument `clean`: Rimraf build artifacts */
if (command === "clean") {
  await rm(resolvedDistPath, { recursive: true, force: true });

  /* Handle argument `build`: Transpile and generate typings */
} else if (command === "build") {
  await build({
    entryPoints: [resolve(relativeProjectRoot, "src/croner.ts")],
    bundle: true,
    minify: true,
    sourcemap: false,
    // Don't let esbuild pick up the root tsconfig.json (used for type checking only).
    // Its "target" would change how class fields are emitted, breaking dist parity.
    tsconfigRaw: {},
  }, [
    {
      outdir: resolvedDistPath,
      platform: "node",
      format: "cjs",
      outExtension: { ".js": ".cjs" },
    },
    {
      outdir: resolvedDistPath,
      platform: "neutral",
      format: "esm",
    },
    {
      entryPoints: [],
      stdin: {
        contents: 'import { Cron } from "./croner.ts";module.exports = Cron;',
        resolveDir: resolve(relativeProjectRoot, "src"),
      },
      outfile: resolve(resolvedDistPath, "croner.umd.js"),
      platform: "browser",
      format: "iife",
      globalName: "Cron",
    },
  ]);

  const { rollup } = await import("rollup");
  const { dts } = await import("rollup-plugin-dts");
  const declarations = await rollup({
    input: resolve(relativeProjectRoot, "src/croner.ts"),
    plugins: [dts({
      compilerOptions: {
        lib: ["lib.es2017.d.ts", "lib.es2017.intl.d.ts", "lib.dom.d.ts"],
        allowImportingTsExtensions: true,
      },
    })],
  });
  await declarations.write({
    file: resolve(resolvedDistPath, "croner.d.ts"),
    format: "es",
  });
  await declarations.close();

  // Just re-use the .d.ts for commonjs, as .d.cts
  await copyFile(
    resolve(resolvedDistPath, "croner.d.ts"),
    resolve(resolvedDistPath, "croner.d.cts"),
  );

  /* Handle argument `sync-version`: Copy version from package.json (source of truth) to deno.json */
} else if (command === "sync-version") {
  const { version } = await readJson<{ version: string }>(packageJsonPath);
  const denoConfig = await readJson<Record<string, unknown>>(denoJsonPath);
  if (denoConfig.version !== version) {
    denoConfig.version = version;
    await writeFile(denoJsonPath, JSON.stringify(denoConfig, null, 2) + "\n");
    console.log(`deno.json version updated to ${version}`);
  } else {
    console.log(`deno.json version already ${version}`);
  }

  /* Handle argument `check-version`: Make sure npm and JSR versions are in sync */
} else if (command === "check-version") {
  const { version: npmVersion } = await readJson<{ version: string }>(packageJsonPath);
  const { version: jsrVersion } = await readJson<{ version: string }>(denoJsonPath);
  if (npmVersion !== jsrVersion) {
    console.error(
      `Version mismatch: package.json has ${npmVersion}, deno.json has ${jsrVersion}. ` +
        "Run `tsx build/build.ts sync-version`.",
    );
    process.exit(1);
  }
  console.log(`Versions in sync (${npmVersion}).`);
} else {
  console.error(
    `Unknown command "${command}". Use one of: clean, build, sync-version, check-version`,
  );
  process.exit(1);
}
