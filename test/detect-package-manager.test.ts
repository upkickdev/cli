import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { detectPackageManager } from "../src/core/detect-package-manager.js";

describe("detectPackageManager", () => {
  it("detects pnpm from its lockfile", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "upkick-pnpm-"));
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");

    await expect(detectPackageManager(root)).resolves.toBe("pnpm");
  });

  it("returns null when no lockfile exists", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "upkick-empty-"));

    await expect(detectPackageManager(root)).resolves.toBeNull();
  });
});
