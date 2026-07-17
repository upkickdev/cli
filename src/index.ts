import { createProgram } from "./program.js";

async function main(): Promise<void> {
  const program = createProgram();

  await program.parseAsync(process.argv);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : "An unexpected error occurred.";

  console.error(`\nError: ${message}\n`);
  process.exitCode = 1;
});
