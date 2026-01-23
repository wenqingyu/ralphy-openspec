import type { Command } from "commander";
import fs from "node:fs/promises";
import path from "node:path";
import { PersistenceLayer } from "../core/memory/persistence";
import { FILES, getRalphyRoot } from "../core/folders";
import { aggregateSpend, extractSpendFromLedger } from "../core/reporting/spend";
import { SpecLoader } from "../core/spec/loader";

export function registerBudgetCommand(program: Command): void {
  program
    .command("budget")
    .description("Show budget/spend information for the latest run")
    .option("--json", "Machine-readable output", false)
    .action(async (opts: { json: boolean }) => {
      const repoRoot = process.cwd();
      const candidateRoots: string[] = [];
      try {
        const spec = await new SpecLoader(repoRoot).loadProjectSpec();
        if (spec.artifacts?.rootDir) candidateRoots.push(spec.artifacts.rootDir);
      } catch {
        // ignore
      }
      candidateRoots.push(undefined as any);

      for (const rootDir of candidateRoots) {
        const budgetPath = path.join(getRalphyRoot(repoRoot, rootDir), FILES.budget);
        try {
          const md = await fs.readFile(budgetPath, "utf8");
          if (!opts.json) {
            process.stdout.write(md.trimEnd() + "\n");
            return;
          }
          // If JSON requested, fall back to DB-derived structure below.
          break;
        } catch {
          // try next
        }
      }

      const persistence = await PersistenceLayer.openForRepo(repoRoot);
      try {
        const run = persistence.getLatestRun();
        if (!run) {
          process.stdout.write(
            opts.json ? JSON.stringify({ ok: true, run: null }) + "\n" : "No runs found.\n"
          );
          return;
        }

        const ledger = persistence.listLedger({ runId: run.runId, limit: 2000 });
        const entries = extractSpendFromLedger(ledger);
        const breakdown = aggregateSpend(entries);

        if (opts.json) {
          process.stdout.write(
            JSON.stringify(
              {
                ok: true,
                runId: run.runId,
                spend: {
                  total: breakdown.total,
                  byTask: Object.fromEntries(breakdown.byTask),
                  byBackend: Object.fromEntries(breakdown.byBackend),
                  byPhase: Object.fromEntries(breakdown.byPhase),
                  entries: breakdown.entries,
                },
              },
              null,
              2
            ) + "\n"
          );
        } else {
          process.stdout.write(
            `No ${FILES.budget} artifact found.\nRun again with artifacts enabled to generate it.\n`
          );
        }
      } finally {
        persistence.close();
      }
    });
}

