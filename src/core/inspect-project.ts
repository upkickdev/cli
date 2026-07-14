import { access, readFile } from "node:fs/promises";
import path from "node:path";
import { detectPackageManager, type PackageManager } from "./detect-package-manager.js";

interface PackageJson {
  name?: unknown;
  packageManager?: unknown;
  workspaces?: unknown;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface ProjectInspection {
  schemaVersion: 1;
  root: string;
  packageName: string | null;
  packageManager: PackageManager | null;
  workspace: boolean;
  frameworks: string[];
  tools: string[];
}

async function exists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function readPackageJson(root: string): Promise<PackageJson | null> {
  try {
    const content = await readFile(path.join(root, "package.json"), "utf8");
    return JSON.parse(content) as PackageJson;
  } catch {
    return null;
  }
}

function hasDependency(packageJson: PackageJson, dependency: string): boolean {
  return Boolean(
    packageJson.dependencies?.[dependency] ?? packageJson.devDependencies?.[dependency],
  );
}

function packageManagerFromManifest(packageJson: PackageJson | null): PackageManager | null {
  if (typeof packageJson?.packageManager !== "string") {
    return null;
  }

  const name = packageJson.packageManager.split("@")[0];
  return name === "pnpm" || name === "npm" || name === "yarn" || name === "bun" ? name : null;
}

function detectFrameworks(packageJson: PackageJson): string[] {
  const frameworks: string[] = [];

  if (hasDependency(packageJson, "next")) frameworks.push("nextjs");
  if (hasDependency(packageJson, "nuxt")) frameworks.push("nuxt");
  if (hasDependency(packageJson, "@remix-run/react")) frameworks.push("remix");
  if (hasDependency(packageJson, "astro")) frameworks.push("astro");
  if (hasDependency(packageJson, "vite")) frameworks.push("vite");
  if (hasDependency(packageJson, "hono")) frameworks.push("hono");

  return frameworks;
}

function detectTools(packageJson: PackageJson): string[] {
  const tools: string[] = [];

  if (hasDependency(packageJson, "turbo")) tools.push("turborepo");
  if (hasDependency(packageJson, "drizzle-orm")) tools.push("drizzle");
  if (hasDependency(packageJson, "prisma")) tools.push("prisma");
  if (hasDependency(packageJson, "better-auth")) tools.push("better-auth");
  if (hasDependency(packageJson, "tailwindcss")) tools.push("tailwindcss");
  if (hasDependency(packageJson, "typescript")) tools.push("typescript");

  return tools;
}

async function detectWorkspace(root: string, packageJson: PackageJson | null): Promise<boolean> {
  if (packageJson?.workspaces) {
    return true;
  }

  return (
    (await exists(path.join(root, "pnpm-workspace.yaml"))) ||
    (await exists(path.join(root, "lerna.json")))
  );
}

export async function inspectProject(root: string): Promise<ProjectInspection> {
  const packageJson = await readPackageJson(root);
  const packageManager =
    (await detectPackageManager(root)) ?? packageManagerFromManifest(packageJson);

  return {
    schemaVersion: 1,
    root,
    packageName: typeof packageJson?.name === "string" ? packageJson.name : null,
    packageManager,
    workspace: await detectWorkspace(root, packageJson),
    frameworks: packageJson ? detectFrameworks(packageJson) : [],
    tools: packageJson ? detectTools(packageJson) : [],
  };
}
