import fs from "node:fs/promises";
import path from "node:path";
import { ensureRalphyFolders, FILES, getRalphyRoot } from "../folders";
import type { BudgetStatus } from "../budgets/tiers";

export type StatusWriterInput = {
  repoRoot: string;
  rootDir?: string;
  runId: string;
  backendId?: string;
  workspaceMode?: string;
  phase: string;
  taskId?: string;
  iteration?: number;
  message?: string;
  tier?: "optimal" | "warning" | "hard";
  budgetStatus?: BudgetStatus | null;
};

export async function writeStatus(input: StatusWriterInput): Promise<void> {
  const root = await ensureRalphyFolders(input.repoRoot, input.rootDir);
  const filePath = path.join(root, FILES.status);

  const lines: string[] = [];
  lines.push(`# STATUS`);
  lines.push(``);
  lines.push(`- **runId**: \`${input.runId}\``);
  if (input.backendId) lines.push(`- **backend**: ${input.backendId}`);
  if (input.workspaceMode) lines.push(`- **workspace**: ${input.workspaceMode}`);
  if (input.taskId) lines.push(`- **taskId**: \`${input.taskId}\``);
  lines.push(`- **phase**: ${input.phase}`);
  if (typeof input.iteration === "number") lines.push(`- **iteration**: ${input.iteration}`);
  if (input.tier) lines.push(`- **tier**: ${input.tier}`);
  lines.push(`- **updatedAt**: ${new Date().toISOString()}`);
  lines.push(``);
  if (input.message) {
    lines.push(`## Message`);
    lines.push(``);
    lines.push(input.message);
    lines.push(``);
  }

  if (input.budgetStatus) {
    const s = input.budgetStatus;
    lines.push(`## Budget`);
    lines.push(``);
    lines.push(`- used: $${s.usedUsd.toFixed(4)}, ${s.usedTokens.toLocaleString()} tokens, ${s.usedIterations} iterations`);
    lines.push(`- tier: ${s.tier}${s.isAtHardCap ? " (HARD CAP)" : ""}`);
    lines.push(``);
  }

  lines.push(`## Files`);
  lines.push(``);
  lines.push(`- root: \`${getRalphyRoot(input.repoRoot, input.rootDir)}\``);
  lines.push(`- runs: \`runs/<runId>.md\` (immutable on completion)`);
  lines.push(`- tasks: \`tasks/<taskId>/\` (CONTEXT.md / REPAIR.md / NOTES.md)`);
  lines.push(``);

  await fs.writeFile(filePath, lines.join("\n"), "utf8");
}

