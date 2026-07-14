import { cac } from "cac";
import pc from "picocolors";
import { runDoctor } from "./commands/doctor.js";
import { runInspect } from "./commands/inspect.js";
import { readPackageVersion } from "./core/package-version.js";

const cli = cac("upkick");
const version = readPackageVersion();

cli
  .command("doctor", "Check whether the local environment is ready for Upkick")
  .action(async () => {
    await runDoctor();
  });

cli
  .command("inspect [directory]", "Inspect a project and print the detected stack")
  .option("--json", "Print machine-readable JSON")
  .action(async (directory: string | undefined, options: { json?: boolean }) => {
    await runInspect(directory, options);
  });

cli.help();
cli.version(version);

try {
  cli.parse();
} catch (error) {
  const message = error instanceof Error ? error.message : "Unknown CLI error";
  console.error(`${pc.red("Error:")} ${message}`);
  process.exitCode = 1;
}
