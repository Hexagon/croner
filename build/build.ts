import esbuild from "esbuild";
import { dtsPlugin } from "esbuild-plugin-d.ts";
import { cp, readFile, writeFile } from "@cross/fs";

/**
 * Build helpers
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
  for (
    const filePath of [
      "package.json",
      "tsconfig.json",
      "node_modules",
      "dist",
    ]
  ) {
    try {
      await Deno.remove(filePath, { recursive: true });
    } catch (_e) { /* No-op */ }
  }

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
      outExtension: { ".js": ".cjs" },
    },
    {
      entryPoints: [],
      stdin: {
        contents: 'import { Cron } from "./croner.ts";module.exports = Cron;',
        resolveDir: "./src/",
      },
      outfile: resolve(resolvedDistPath, "croner.umd.js"),
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
            lib: ["es6", "dom"],
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
  await writeFile(
    resolve(relativeProjectRoot, "package.json"),
    new TextEncoder().encode(JSON.stringify(
      {
        ...await readJson<object>(resolve(relativeProjectRoot, "build/package.template.json")),
        version: denoConfig.version,
      },
      null,
      2,
    )),
  );
}
