import { dirname, fromFileUrl, resolve } from "@std/path";
import { rm, rmdir } from "@cross/fs";
import { isDir, isFile } from "@cross/fs/stat";

const relativeProjectRoot = "../";
const outputFolder = "dist";

const currentScriptDir = dirname(fromFileUrl(import.meta.url));

const resolvedDistPath = resolve(currentScriptDir, relativeProjectRoot, outputFolder);
const resolvedNodeModulesPath = resolve(currentScriptDir, relativeProjectRoot, "node_modules");
const resolvedPackageJsonPath = resolve(currentScriptDir, relativeProjectRoot, "package.json");

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
