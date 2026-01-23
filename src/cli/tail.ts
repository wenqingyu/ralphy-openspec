import type { Command } from "commander";
import { PersistenceLayer } from "../core/memory/persistence";

export function registerTailCommand(program: Command): void {
  program
    .command("tail")
    .description("Stream ledger events for the latest run (polling)")
    .option("--interval-ms <n>", "Polling interval (ms)", "1000")
    .action(async (opts: { intervalMs: string }) => {
      const intervalMs = Number(opts.intervalMs);
      const repoRoot = process.cwd();
      const persistence = await PersistenceLayer.openForRepo(repoRoot);
      const run = persistence.getLatestRun();
      if (!run) {
        persistence.close();
        process.stderr.write("No runs found.\n");
        process.exitCode = 1;
        return;
      }

      process.stdout.write(`Tailing run ${run.runId}...\n`);

      let lastCount = 0;
      const timer = setInterval(() => {
        try {
          const ledger = persistence.listLedger({ runId: run.runId, limit: 200 });
          const newEvents = ledger.slice(lastCount);
          for (const ev of newEvents) {
            process.stdout.write(
              `${ev.ts} ${ev.kind}${ev.taskId ? ` [${ev.taskId}]` : ""}: ${ev.message}\n`
            );
          }
          lastCount = ledger.length;
        } catch (e: any) {
          process.stderr.write(e?.message ? String(e.message) : String(e));
          process.stderr.write("\n");
        }
      }, Number.isFinite(intervalMs) ? intervalMs : 1000);

      const shutdown = () => {
        clearInterval(timer);
        persistence.close();
        process.exit(0);
      };

      process.on("SIGINT", shutdown);
      process.on("SIGTERM", shutdown);
    });
}

