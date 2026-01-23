import fs from "node:fs/promises";
import path from "node:path";
import type { TaskSpec } from "../spec/types";
import type { TaskStatus } from "../memory/persistence";
import { ensureRalphyFolders, FILES } from "../folders";

export type StatusIconMode = "emoji" | "ascii" | "none";

const STATUS_ICON_EMOJI: Record<TaskStatus, string> = {
  pending: "⬜",
  running: "⏳",
  done: "✅",
  blocked: "⛔",
  error: "❌",
};

const STATUS_ICON_ASCII: Record<TaskStatus, string> = {
  pending: "[ ]",
  running: "[~]",
  done: "[x]",
  blocked: "[!]",
  error: "[x!]",
};

export type TaskRow = {
  taskId: string;
  status: TaskStatus;
  phase?: string;
  iteration: number;
  lastError?: string;
};

export async function writeTasksBoard(args: {
  repoRoot: string;
  rootDir?: string;
  runId: string;
  statusIcons?: StatusIconMode;
  specTasks: TaskSpec[];
  rows: TaskRow[];
}): Promise<void> {
  const root = await ensureRalphyFolders(args.repoRoot, args.rootDir);
  const filePath = path.join(root, FILES.tasks);

  const titleById = new Map(args.specTasks.map((t) => [t.id, t.title] as const));
  const goalById = new Map(args.specTasks.map((t) => [t.id, t.goal] as const));

  const lines: string[] = [];
  lines.push(`# TASKS`);
  lines.push(``);
  lines.push(`- **runId**: \`${args.runId}\``);
  lines.push(`- **updatedAt**: ${new Date().toISOString()}`);
  lines.push(``);
  lines.push(`| Task | Status | Phase | Iter | Title |`);
  lines.push(`|------|--------|-------|------|-------|`);
  for (const r of args.rows) {
    const mode: StatusIconMode = args.statusIcons ?? "emoji";
    const icon =
      mode === "none"
        ? ""
        : (mode === "ascii" ? STATUS_ICON_ASCII : STATUS_ICON_EMOJI)[r.status] ?? "";
    const title = titleById.get(r.taskId) ?? "";
    const statusCell = `${icon ? `${icon} ` : ""}${r.status}`;
    lines.push(
      `| \`${r.taskId}\` | ${statusCell} | ${r.phase ?? ""} | ${r.iteration} | ${escapePipes(title)} |`
    );
  }
  lines.push(``);

  // Optional details for blocked/error tasks.
  const trouble = args.rows.filter((r) => r.status === "blocked" || r.status === "error");
  if (trouble.length) {
    lines.push(`## Attention`);
    lines.push(``);
    for (const r of trouble) {
      lines.push(`### ${r.taskId}`);
      const goal = goalById.get(r.taskId);
      if (goal) lines.push(goal.trim());
      if (r.lastError) lines.push(`\nLast error: ${r.lastError}`);
      lines.push(``);
    }
  }

  await fs.writeFile(filePath, lines.join("\n"), "utf8");
}

function escapePipes(s: string): string {
  return s.replace(/\|/g, "\\|");
}

