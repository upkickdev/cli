import { access } from "node:fs/promises";
import path from "node:path";

export type PackageManager = "pnpm" | "npm" | "yarn" | "bun";

const lockfiles: ReadonlyArray<readonly [string, PackageManager]> = [
  ["pnpm-lock.yaml", "pnpm"],
  ["bun.lock", "bun"],
  ["bun.lockb", "bun"],
  ["yarn.lock", "yarn"],
  ["package-lock.json", "npm"],
  ["npm-shrinkwrap.json", "npm"],
];

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function detectPackageManager(root: string): Promise<PackageManager | null> {
  for (const [lockfile, packageManager] of lockfiles) {
    if (await exists(path.join(root, lockfile))) {
      return packageManager;
    }
  }

  return null;
}
