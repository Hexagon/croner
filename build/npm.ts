import { readFile, writeFile } from "@cross/fs";
import { dirname, fromFileUrl, resolve } from "@std/path";

const relativeProjectRoot = "../";

const currentScriptDir = dirname(fromFileUrl(import.meta.url));

const resolvedPath = resolve(currentScriptDir, relativeProjectRoot);

async function generatePackageJson() {
  // Read deno.json
  const denoConfigPath = resolve(resolvedPath, "deno.json");
  const denoConfig = JSON.parse(new TextDecoder().decode(await readFile(denoConfigPath))) as {
    name: string;
    version: string;
  };

  // Define package.json template
  const packageJson = {
    name: "croner",
    //name: denoConfig.name,
    version: denoConfig.version,
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

  // Write package.json
  const packageJsonPath = resolve(resolvedPath, "package.json");
  await writeFile(
    packageJsonPath,
    new TextEncoder().encode(JSON.stringify(packageJson, undefined, 2)),
  );

  console.log("package.json has been generated successfully.");
}

await generatePackageJson();
