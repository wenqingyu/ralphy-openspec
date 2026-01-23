import type { Command } from "commander";
import path from "node:path";
import { PatchModeWorkspace } from "../core/workspace/patch-mode";

export function registerCheckpointCommand(program: Command): void {
  program
    .command("checkpoint")
    .description("Create a manual checkpoint commit (patch-mode only)")
    .requiredOption("--task <taskId>", "Task id")
    .requiredOption("--message <message>", "Checkpoint message")
    .action(async (opts: { task: string; message: string }) => {
      const repoRoot = process.cwd();
      const ws = new PatchModeWorkspace(path.resolve(repoRoot));
      await ws.prepare(opts.task);
      const ref = await ws.checkpoint(opts.task, opts.message);
      process.stdout.write(`Checkpoint ${ref.ref}\n`);
    });
}

