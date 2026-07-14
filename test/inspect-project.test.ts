import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { inspectProject } from "../src/core/inspect-project.js";

describe("inspectProject", () => {
  it("detects a Next.js workspace and common tools", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "upkick-project-"));

    await writeFile(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "example",
        workspaces: ["apps/*", "packages/*"],
        dependencies: {
          next: "latest",
          "drizzle-orm": "latest",
          "better-auth": "latest",
        },
        devDependencies: {
          turbo: "latest",
          typescript: "latest",
        },
      }),
    );
    await writeFile(path.join(root, "pnpm-lock.yaml"), "lockfileVersion: '9.0'\n");

    const result = await inspectProject(root);

    expect(result.packageName).toBe("example");
    expect(result.packageManager).toBe("pnpm");
    expect(result.workspace).toBe(true);
    expect(result.frameworks).toContain("nextjs");
    expect(result.tools).toEqual(
      expect.arrayContaining(["turborepo", "drizzle", "better-auth", "typescript"]),
    );
  });
});

it("detects package manager metadata and pnpm workspaces without a lockfile", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "upkick-workspace-"));

  await writeFile(
    path.join(root, "package.json"),
    JSON.stringify({ name: "workspace", packageManager: "pnpm@10.13.1" }),
  );
  await writeFile(path.join(root, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n");

  const result = await inspectProject(root);

  expect(result.packageManager).toBe("pnpm");
  expect(result.workspace).toBe(true);
});
