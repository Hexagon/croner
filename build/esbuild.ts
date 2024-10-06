import esbuild from "esbuild";
import { dtsPlugin } from "esbuild-plugin-d.ts";
import { exit } from "@cross/utils";
import { dirname, fromFileUrl, resolve } from "@std/path";
import { cp } from "@cross/fs";

let relativeProjectRoot = "../";
const outputFolder = "dist";

const currentScriptDir = dirname(fromFileUrl(import.meta.url));
relativeProjectRoot = resolve(currentScriptDir, relativeProjectRoot);

const tsConfig = {
  declaration: true,
  compilerOptions: {
    outFile: resolve(relativeProjectRoot, "dist", "croner.min.d.ts"),
    allowImportingTsExtensions: true,
    target: "ES6",
  },
};

const dtsPluginInstance = dtsPlugin({
  tsconfig: tsConfig,
});

// Function to build with esbuild
async function build() {
  // CommonJS build
  await esbuild.build({
    entryPoints: [resolve(relativeProjectRoot, "src/croner.ts")],
    outfile: resolve(relativeProjectRoot, outputFolder, "croner.min.cjs"),
    bundle: true,
    minify: true,
    platform: "node",
    format: "cjs",
    sourcemap: false,
    plugins: [dtsPluginInstance],
  });

  // UMD build
  await esbuild.build({
    entryPoints: [resolve(relativeProjectRoot, "src/croner.ts")],
    outfile: resolve(relativeProjectRoot, outputFolder, "croner.umd.min.js"),
    bundle: true,
    minify: true,
    platform: "browser",
    format: "iife",
    globalName: "croner",
    sourcemap: false,
    plugins: [dtsPluginInstance],
  });

  // ESM build
  await esbuild.build({
    entryPoints: [resolve(relativeProjectRoot, "src/croner.ts")],
    outfile: resolve(relativeProjectRoot, outputFolder, "croner.min.js"),
    bundle: true,
    minify: true,
    platform: "neutral",
    format: "esm",
    sourcemap: false,
    plugins: [dtsPluginInstance],
  });
}

// Run the build function
try {
  await build();
} catch (error) {
  console.error(error);
  exit(1);
}

// Copy .d.ts to .d.cts
await cp(
  resolve(relativeProjectRoot, outputFolder, "croner.min.d.ts"),
  resolve(relativeProjectRoot, outputFolder, "croner.min.d.cts"),
);
