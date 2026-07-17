import { Command } from "commander";
import { registerCreateCommand } from "./commands/create/index.js";

export function createProgram(): Command {
  const program = new Command();

  program
    .name("upkick")
    .description("AI-powered project scaffolding and code generation CLI")
    .version("0.1.3")
    .showHelpAfterError()
    .showSuggestionAfterError();

  registerCreateCommand(program);

  return program;
}
