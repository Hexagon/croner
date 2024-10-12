import esbuild from "esbuild";
import { readFile, rm, rmdir, writeFile, cp } from "@cross/fs";
import { expandGlob } from "@std/fs";
import { dtsPlugin } from "esbuild-plugin-d.ts";

/**
 * Helper: Builds one or more esbuild configurations.
 * @param baseConfig - The base esbuild configuration.
 * @param configs - An optional array of configurations extending the base configuration.
 * @returns A promise that resolves when all builds are complete.
 */
export async function build(
  baseConfig: esbuild.BuildOptions,
  configs?: esbuild.BuildOptions[],
): Promise<void> {
  const buildConfigs = configs?.map((config) => ({ ...baseConfig, ...config })) || [baseConfig];

  try {
    await Promise.all(buildConfigs.map((config) => esbuild.build(config)));
    console.log("All builds completed successfully.");
  } catch (error) {
    console.error("Build failed:", error);
  }
}

/**
 * Helper: Recursively removes files and folders based on the provided glob patterns.
 *
 * @param files - An array of glob patterns for files to be removed.
 * @param folders - An array of glob patterns for folders to be removed.
 * @returns A promise that resolves when all specified files and folders have been removed.
 */
async function rimraf(files: string[]): Promise<void> {
  // Handle files
  for (const pattern of files) {
    const filePaths = await Array.fromAsync(expandGlob(pattern));
    for (const filePath of filePaths) {
      if (filePath.isFile) {
        await rm(filePath.name);
      } else if (filePath.isDirectory) {
        await rmdir(filePath.name, {
          recursive: true,
        });
      }
    }
  }
}

/**
 * Helper: Writes a JavaScript object to a JSON file.
 * @param filePath - The path to the file where the JSON will be written.
 * @param data - The JavaScript object to write to the file.
 * @returns A promise that resolves when the file has been written.
 */
async function writeJson(filePath: string, data: object): Promise<void> {
  const jsonData = JSON.stringify(data, null, 2);
  await writeFile(filePath, new TextEncoder().encode(jsonData));
}

/**
 * Helper: Reads a JSON file and parses its content to a JavaScript object.
 * @param filePath - The path to the JSON file to read.
 * @returns A promise that resolves to the parsed JavaScript object.
 */
async function readJson<T>(filePath: string): Promise<T> {
  const jsonData = await readFile(filePath);
  return JSON.parse(new TextDecoder().decode(jsonData)) as T;
}

/**
 * Now the actual build script
 */

import { dirname, fromFileUrl, resolve } from "@std/path";

/* Preparations - Work out paths */
const baseRelativeProjectRoot = "../"; // Where is this script located relative to the project root
const currentScriptDir = dirname(fromFileUrl(import.meta.url));
const relativeProjectRoot = resolve(currentScriptDir, baseRelativeProjectRoot);
const resolvedDistPath = resolve(relativeProjectRoot, "dist");

/* Handle argument `clean`: Rimraf build artifacts */
if (Deno.args[1] === "clean") {
  await rimraf([
    "package.json",
    "tsconfig.json",
    "node_modules",
    "dist",
  ]);

  /* Handle argument `build`: Transpile and generate typings */
} else if (Deno.args[1] === "build") {
  await build({
    entryPoints: [resolve(relativeProjectRoot, "src/croner.ts")],
    bundle: true,
    minify: true,
    sourcemap: false,
  }, [
    {
      outdir: resolvedDistPath,
      platform: "node",
      format: "cjs",
      outExtension: { ".js": ".cjs" }
    },
    {
      outdir: resolvedDistPath,
      outExtension: { ".js": ".umd.js" },
      platform: "browser",
      format: "iife",
      globalName: "Cron",
    },
    {
      outdir: resolvedDistPath,
      platform: "neutral",
      format: "esm",
      plugins: [dtsPlugin({
        experimentalBundling: true,
        tsconfig: {
          compilerOptions: {
            declaration: true,
            emitDeclarationOnly: true,
            allowImportingTsExtensions: true,
            lib: ["es6", "dom"]
          },
        },
      })],
    },
  ]);

  // Just re-use the .d.ts for commonjs, as .d.cts
  await cp(
    resolve(resolvedDistPath, "croner.d.ts"),
    resolve(resolvedDistPath, "croner.d.cts"),
  );

  /* Handle argument `package`: Generate package.json based on a base config and values from deno,json */
} else if (Deno.args[1] === "package") {
  // Read version from deno.json
  const denoConfig = await readJson<{ version: string }>(resolve(relativeProjectRoot, "deno.json"));

  // Write package.json
  await writeJson(resolve(relativeProjectRoot, "package.json"), {
    ...await readJson(resolve(relativeProjectRoot, "build/package.template.json")),
    version: denoConfig.version,
  });
}
