import { Command } from "commander";

import { type RunCreateCommandOptions, runCreateCommand } from "./action.js";

export interface CreateCommandOptions {
  template: string;
  version?: string;
  directory?: string;
  overwrite: boolean;
  install: boolean;
  git: boolean;
}

export function createCreateCommand(): Command {
  return new Command("create")
    .description("Create a new project from an Upkick template")
    .argument("<project-name>", "Name of the project")
    .option("-t, --template <template>", "Template to use", "base")
    .option("-v, --version <version>", "Specific template version to use")
    .option("-d, --directory <directory>", "Parent directory where the project will be created")
    .option("--overwrite", "Replace the target directory if it already exists", false)
    .option("--no-install", "Skip dependency installation")
    .option("--no-git", "Skip Git repository initialization")
    .action(async (projectName: string, options: CreateCommandOptions): Promise<void> => {
      const commandOptions: RunCreateCommandOptions = {
        projectName,
        template: options.template,
        overwrite: options.overwrite,
        install: options.install,
        git: options.git,
        ...(options.version !== undefined ? { version: options.version } : {}),
        ...(options.directory !== undefined ? { directory: options.directory } : {}),
      };

      await runCreateCommand(commandOptions);
    });
}

export function registerCreateCommand(program: Command): void {
  program.addCommand(createCreateCommand());
}
