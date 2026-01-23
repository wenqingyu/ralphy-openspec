import { Command } from "commander";
import { registerInitCommand } from "./cli/init";
import { registerValidateCommand } from "./cli/validate";
import { registerUpdateCommand } from "./cli/update";
import { registerRunCommand } from "./cli/run";
import { registerStatusCommand } from "./cli/status";
import { registerReportCommand } from "./cli/report";
import { registerTailCommand } from "./cli/tail";
import { registerCheckpointCommand } from "./cli/checkpoint";

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
  registerRunCommand(program);
  registerStatusCommand(program);
  registerReportCommand(program);
  registerTailCommand(program);
  registerCheckpointCommand(program);

  return program;
}

async function main() {
  const program = buildProgram();
  await program.parseAsync(process.argv);
}

// eslint-disable-next-line @typescript-eslint/no-floating-promises
main();

