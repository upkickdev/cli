import path from "node:path";
import pc from "picocolors";
import { inspectProject } from "../core/inspect-project.js";

interface InspectOptions {
  json?: boolean;
}

export async function runInspect(
  directory: string | undefined,
  options: InspectOptions,
): Promise<void> {
  const root = path.resolve(directory ?? process.cwd());
  const result = await inspectProject(root);

  if (options.json) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  console.log(pc.bold("Upkick Project Inspection"));
  console.log();
  console.log(`${pc.dim("Directory:")} ${result.root}`);
  console.log(`${pc.dim("Package:")} ${result.packageName ?? pc.yellow("not detected")}`);
  console.log(
    `${pc.dim("Package manager:")} ${result.packageManager ?? pc.yellow("not detected")}`,
  );
  console.log(`${pc.dim("Workspace:")} ${result.workspace ? "yes" : "no"}`);
  console.log(
    `${pc.dim("Frameworks:")} ${result.frameworks.length > 0 ? result.frameworks.join(", ") : pc.yellow("not detected")}`,
  );
  console.log(
    `${pc.dim("Tools:")} ${result.tools.length > 0 ? result.tools.join(", ") : pc.yellow("not detected")}`,
  );
}
