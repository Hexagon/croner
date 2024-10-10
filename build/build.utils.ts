import esbuild from "esbuild";
import { readFile, rm, rmdir, writeFile } from "@cross/fs";
import { expandGlob } from "@std/fs";

/* Direct exports */
export { dtsPlugin } from "esbuild-plugin-d.ts";
export { cp } from "@cross/fs";

/**
 * Builds one or more esbuild configurations.
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
 * Recursively removes files and folders based on the provided glob patterns.
 *
 * @param files - An array of glob patterns for files to be removed.
 * @param folders - An array of glob patterns for folders to be removed.
 * @returns A promise that resolves when all specified files and folders have been removed.
 */
export async function rimraf(files: string[]): Promise<void> {
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
 * Writes a JavaScript object to a JSON file.
 * @param filePath - The path to the file where the JSON will be written.
 * @param data - The JavaScript object to write to the file.
 * @returns A promise that resolves when the file has been written.
 */
export async function writeJson(filePath: string, data: object): Promise<void> {
  const jsonData = JSON.stringify(data, null, 2);
  await writeFile(filePath, new TextEncoder().encode(jsonData));
}

/**
 * Reads a JSON file and parses its content to a JavaScript object.
 * @param filePath - The path to the JSON file to read.
 * @returns A promise that resolves to the parsed JavaScript object.
 */
export async function readJson<T>(filePath: string): Promise<T> {
  const jsonData = await readFile(filePath);
  return JSON.parse(new TextDecoder().decode(jsonData)) as T;
}
