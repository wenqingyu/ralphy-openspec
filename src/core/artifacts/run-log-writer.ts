import fs from "node:fs/promises";
import path from "node:path";
import { ensureRalphyFolders, FOLDERS } from "../folders";

export async function writeRunLogOnce(args: {
  repoRoot: string;
  rootDir?: string;
  runId: string;
  outcome: { ok: boolean; exitCode?: number; reason?: string };
  ledgerEvents: Array<{ ts: string; kind: string; message: string; taskId?: string }>;
}): Promise<{ path: string; created: boolean }> {
  const root = await ensureRalphyFolders(args.repoRoot, args.rootDir);
  const filePath = path.join(root, FOLDERS.runs, `${args.runId}.md`);

  const lines: string[] = [];
  lines.push(`# Run log`);
  lines.push(``);
  lines.push(`- **runId**: \`${args.runId}\``);
  lines.push(`- **status**: ${args.outcome.ok ? "success" : "stopped"}`);
  if (!args.outcome.ok) {
    lines.push(`- **exitCode**: ${args.outcome.exitCode ?? "?"}`);
    lines.push(`- **reason**: ${args.outcome.reason ?? "unknown"}`);
  }
  lines.push(`- **createdAt**: ${new Date().toISOString()}`);
  lines.push(``);
  lines.push(`## Ledger (chronological)`);
  lines.push(``);
  for (const ev of args.ledgerEvents) {
    lines.push(
      `- ${ev.ts} ${ev.kind}${ev.taskId ? ` [${ev.taskId}]` : ""}: ${ev.message}`
    );
  }
  lines.push(``);

  try {
    await fs.writeFile(filePath, lines.join("\n"), { encoding: "utf8", flag: "wx" });
    return { path: filePath, created: true };
  } catch (e: any) {
    if (e?.code === "EEXIST") return { path: filePath, created: false };
    throw e;
  }
}

