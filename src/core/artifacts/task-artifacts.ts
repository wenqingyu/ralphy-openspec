import fs from "node:fs/promises";
import path from "node:path";
import { ensureRalphyFolders, FOLDERS } from "../folders";

function safeTaskDirName(taskId: string): string {
  return taskId.replace(/[^a-zA-Z0-9-_]/g, "_");
}

async function ensureTaskDir(repoRoot: string, rootDir: string | undefined, taskId: string) {
  const root = await ensureRalphyFolders(repoRoot, rootDir);
  const dir = path.join(root, FOLDERS.tasks, safeTaskDirName(taskId));
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

export async function writeTaskContext(args: {
  repoRoot: string;
  rootDir?: string;
  taskId: string;
  markdown: string;
}): Promise<void> {
  const dir = await ensureTaskDir(args.repoRoot, args.rootDir, args.taskId);
  await fs.writeFile(path.join(dir, "CONTEXT.md"), args.markdown, "utf8");
}

export async function writeTaskRepair(args: {
  repoRoot: string;
  rootDir?: string;
  taskId: string;
  markdown: string;
}): Promise<void> {
  const dir = await ensureTaskDir(args.repoRoot, args.rootDir, args.taskId);
  await fs.writeFile(path.join(dir, "REPAIR.md"), args.markdown, "utf8");
}

export async function appendTaskNotes(args: {
  repoRoot: string;
  rootDir?: string;
  taskId: string;
  note: string;
}): Promise<void> {
  const dir = await ensureTaskDir(args.repoRoot, args.rootDir, args.taskId);
  const p = path.join(dir, "NOTES.md");
  const line = `- ${new Date().toISOString()} ${args.note}\n`;
  await fs.appendFile(p, line, "utf8").catch(async () => fs.writeFile(p, line, "utf8"));
}

