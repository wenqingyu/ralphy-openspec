import type { Command } from "commander";
import fs from "node:fs/promises";
import path from "node:path";
import Table from "cli-table3";
import { PersistenceLayer } from "../core/memory/persistence";
import { FILES, getRalphyRoot } from "../core/folders";
import { SpecLoader } from "../core/spec/loader";

export function registerStatusCommand(program: Command): void {
  program
    .command("status")
    .description("Show current/most recent run status")
    .option("--json", "Machine-readable output", false)
    .action(async (opts: { json: boolean }) => {
      const repoRoot = process.cwd();

      // Artifact-first: if STATUS.md exists, display it as primary source of truth.
      const candidateRoots: string[] = [];
      try {
        const spec = await new SpecLoader(repoRoot).loadProjectSpec();
        if (spec.artifacts?.rootDir) candidateRoots.push(spec.artifacts.rootDir);
      } catch {
        // ignore spec load failures
      }
      candidateRoots.push(undefined as any); // default

      for (const rootDir of candidateRoots) {
        const statusPath = path.join(getRalphyRoot(repoRoot, rootDir), FILES.status);
        try {
          const statusMd = await fs.readFile(statusPath, "utf8");
          if (opts.json) {
            process.stdout.write(
              JSON.stringify(
                { ok: true, source: "artifact", statusPath, statusMarkdown: statusMd },
                null,
                2
              ) + "\n"
            );
          } else {
            process.stdout.write(statusMd.trimEnd() + "\n");
          }
          return;
        } catch {
          // try next candidate
        }
      }

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

