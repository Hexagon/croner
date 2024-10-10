import { dirname, fromFileUrl, resolve } from "@std/path";
import { build, cp, dtsPlugin, readJson, rimraf, writeJson } from "./build.utils.ts";

/* Preparations - Work out paths */
const baseRelativeProjectRoot = "../"; // Where is this script located relative to the project root
const currentScriptDir = dirname(fromFileUrl(import.meta.url));
const relativeProjectRoot = resolve(currentScriptDir, baseRelativeProjectRoot);
const resolvedDistPath = resolve(relativeProjectRoot, "dist");

/* Argument `clean`: Rimraf build artifacts */
if (Deno.args[1] === "clean") {
  await rimraf([
    "package.json",
    "tsconfig.json",
    "node_modules",
    "dist",
  ]);

  /* Argument `build`: Transpile and generate typings */
} else if (Deno.args[1] === "build") {
  cp(
    resolve(relativeProjectRoot, "build/templates/tsconfig.template.json"),
    resolve(relativeProjectRoot, "tsconfig.json"),
  );

  await build({
    entryPoints: [resolve(relativeProjectRoot, "src/croner.ts")],
    bundle: true,
    minify: true,
    sourcemap: false,
  }, [
    {
      outfile: resolve(resolvedDistPath, "croner.cjs"),
      platform: "node",
      format: "cjs",
    },
    {
      outfile: resolve(resolvedDistPath, "croner.umd.js"),
      platform: "browser",
      format: "iife",
      globalName: "Cron",
    },
    {
      outdir: resolvedDistPath,
      platform: "neutral",
      format: "esm",
      plugins: [dtsPlugin({ experimentalBundling: true })],
    },
  ]);

  await cp(
    resolve(resolvedDistPath, "croner.d.ts"),
    resolve(resolvedDistPath, "croner.d.cts"),
  );

  /* Argument `package`: Generate package.json based on a base config and values from deno,json */
} else if (Deno.args[1] === "package") {
  // Read version from deno.json
  const denoConfig = await readJson<{ version: string }>(resolve(relativeProjectRoot, "deno.json"));

  // Write package.json
  await writeJson(resolve(relativeProjectRoot, "package.json"), {
    ...await readJson(resolve(relativeProjectRoot, "build/templates/package.template.json")),
    version: denoConfig.version,
  });
}
