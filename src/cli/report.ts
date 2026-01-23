import type { Command } from "commander";
import fs from "node:fs/promises";
import path from "node:path";
import { PersistenceLayer } from "../core/memory/persistence";

export function registerReportCommand(program: Command): void {
  program
    .command("report")
    .description("Generate a markdown report for the latest run")
    .option("--out <filepath>", "Output markdown file", "ralphy-report.md")
    .option("--json", "Machine-readable output", false)
    .action(async (opts: { out: string; json: boolean }) => {
      const repoRoot = process.cwd();
      const persistence = await PersistenceLayer.openForRepo(repoRoot);
      try {
        const run = persistence.getLatestRun();
        if (!run) {
          process.stderr.write("No runs found.\n");
          process.exitCode = 1;
          return;
        }

        const ledger = persistence.listLedger({ runId: run.runId, limit: 500 });
        const md = [
          `# Ralphy Spec Report`,
          ``,
          `- Run ID: \`${run.runId}\``,
          `- Status: \`${run.status}\``,
          `- Started: \`${run.startedAt}\``,
          ``,
          `## Recent ledger`,
          ``,
          ...ledger.map(
            (e) =>
              `- ${e.ts} \`${e.kind}\`${e.taskId ? ` (\`${e.taskId}\`)` : ""}: ${e.message}`
          ),
          ``,
        ].join("\n");

        const outPath = path.resolve(repoRoot, opts.out);
        await fs.writeFile(outPath, md, "utf8");

        if (opts.json) {
          process.stdout.write(
            JSON.stringify({ ok: true, runId: run.runId, out: outPath }, null, 2) + "\n"
          );
        } else {
          process.stdout.write(`Wrote ${outPath}\n`);
        }
      } finally {
        persistence.close();
      }
    });
}

