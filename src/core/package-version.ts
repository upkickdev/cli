import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

interface PackageManifest {
  version?: unknown;
}

export function readPackageVersion(): string {
  try {
    const packagePath = fileURLToPath(new URL("../package.json", import.meta.url));
    const manifest = JSON.parse(readFileSync(packagePath, "utf8")) as PackageManifest;

    return typeof manifest.version === "string" ? manifest.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}
