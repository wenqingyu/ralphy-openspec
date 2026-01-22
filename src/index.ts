import { Command } from "commander";
import { registerInitCommand } from "./commands/init";
import { registerValidateCommand } from "./commands/validate";
import { registerUpdateCommand } from "./commands/update";

function buildProgram(): Command {
  const program = new Command();

  program
    .name("ralphy-spec")
    .description(
      "One-command setup for Ralph loop + OpenSpec workflows across Cursor, OpenCode, and Claude Code."
    )
    .version("0.1.2");

  registerInitCommand(program);
  registerValidateCommand(program);
  registerUpdateCommand(program);

  return program;
}

async function main() {
  const program = buildProgram();
  await program.parseAsync(process.argv);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();

