import fs from "node:fs/promises";
import path from "node:path";
import { ensureRalphyFolders, FILES } from "../folders";
import { aggregateSpend, extractSpendFromLedger, formatSpendReport } from "../reporting/spend";

export async function writeBudgetReport(args: {
  repoRoot: string;
  rootDir?: string;
  runId: string;
  ledgerEvents: Array<{ taskId?: string; kind: string; data?: unknown }>;
}): Promise<void> {
  const root = await ensureRalphyFolders(args.repoRoot, args.rootDir);
  const filePath = path.join(root, FILES.budget);

  const breakdown = aggregateSpend(extractSpendFromLedger(args.ledgerEvents));
  const md = [
    `# BUDGET`,
    ``,
    `- **runId**: \`${args.runId}\``,
    `- **updatedAt**: ${new Date().toISOString()}`,
    ``,
    formatSpendReport(breakdown),
    ``,
    `> Note: spend is best-effort and depends on backend emitting usage. Today, wallTime/iterations are tracked; USD/tokens may be 0 for some backends.`,
    ``,
  ].join("\n");

  await fs.writeFile(filePath, md, "utf8");
}

