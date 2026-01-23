import type { Command } from "commander";
import Table from "cli-table3";
import { PersistenceLayer } from "../core/memory/persistence";

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Show current/most recent run status")
    .option("--json", "Machine-readable output", false)
    .action(async (opts: { json: boolean }) => {
      const repoRoot = process.cwd();
      const persistence = await PersistenceLayer.openForRepo(repoRoot);
      try {
        const run = persistence.getLatestRun();
        if (!run) {
          process.stdout.write(opts.json ? JSON.stringify({ ok: true, run: null }) + "\n" : "No runs found.\n");
          return;
        }

        const ledger = persistence.listLedger({ runId: run.runId, limit: 20 });

        if (opts.json) {
          process.stdout.write(
            JSON.stringify(
              {
                ok: true,
                runSummary: run,
                recentLedger: ledger,
              },
              null,
              2
            ) + "\n"
          );
          return;
        }

        const table = new Table({ head: ["Field", "Value"] });
        table.push(["runId", run.runId], ["status", run.status], ["startedAt", run.startedAt]);
        process.stdout.write(table.toString() + "\n\n");
        process.stdout.write("Recent events:\n");
        for (const ev of ledger) {
          process.stdout.write(`- ${ev.ts} ${ev.kind}${ev.taskId ? ` [${ev.taskId}]` : ""}: ${ev.message}\n`);
        }
      } finally {
        persistence.close();
      }
    });
}

