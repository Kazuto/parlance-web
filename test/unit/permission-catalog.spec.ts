import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { ALL_PERMISSIONS } from "../permissions";

const webRoot = join(import.meta.dirname, "../..");
const appRoot = join(webRoot, "app");

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return name === "lib" ? [] : sourceFiles(path);
    }
    return /\.(vue|ts)$/.test(name) ? [path] : [];
  });
}

// A permission string looks like "<action>_<resource>"; collect every literal of
// that shape that sits where the app checks permissions.
const PERMISSION_LITERAL =
  /["'`]((?:create|read|update|delete|permanent_delete)_[a-z_]+)["'`]/g;

function permissionsUsedInApp() {
  const used = new Map<string, string[]>();
  for (const file of sourceFiles(appRoot)) {
    for (const match of readFileSync(file, "utf8").matchAll(
      PERMISSION_LITERAL,
    )) {
      const name = match[1]!;
      used.set(name, [...(used.get(name) ?? []), relative(webRoot, file)]);
    }
  }
  return used;
}

describe("permission catalog", () => {
  it("only checks known permissions", () => {
    // A typo would hide its button from everyone, admins included.
    const known = new Set<string>(ALL_PERMISSIONS);
    const unknown = [...permissionsUsedInApp()]
      .filter(([name]) => !known.has(name))
      .map(([name, files]) => `${name} in ${[...new Set(files)].join(", ")}`);

    expect(unknown).toEqual([]);
  });

  it("finds the permission checks it is meant to verify", () => {
    // Guards the scan itself: if it found nothing, the test above would pass vacuously.
    const used = permissionsUsedInApp();
    for (const name of [
      "create_entry",
      "update_entry",
      "delete_entry",
      "update_locale",
      "create_definition",
      "update_definition",
      "read_role",
    ]) {
      expect(used.has(name), name).toBe(true);
    }
  });
});
