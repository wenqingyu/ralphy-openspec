import fs from "node:fs/promises";
import path from "node:path";
import fse from "fs-extra";

export const LEGACY_ROOT_DIR = ".ralphy";
export const DEFAULT_ROOT_DIR = "ralphy-spec";

export const FOLDERS = {
  runs: "runs",
  logs: "logs",
  worktrees: "worktrees",
  tasks: "tasks",
} as const;

export const FILES = {
  db: "state.db",
  status: "STATUS.md",
  tasks: "TASKS.md",
  budget: "BUDGET.md",
} as const;

export function getRalphyRoot(repoRoot: string, overrideDir?: string): string {
  return path.join(repoRoot, overrideDir ?? DEFAULT_ROOT_DIR);
}

export async function ensureRalphyFolders(repoRoot: string, overrideDir?: string) {
  const root = getRalphyRoot(repoRoot, overrideDir);
  await fs.mkdir(root, { recursive: true });
  await fs.mkdir(path.join(root, FOLDERS.runs), { recursive: true });
  await fs.mkdir(path.join(root, FOLDERS.logs), { recursive: true });
  await fs.mkdir(path.join(root, FOLDERS.worktrees), { recursive: true });
  await fs.mkdir(path.join(root, FOLDERS.tasks), { recursive: true });
  return root;
}

export async function migrateLegacyIfNeeded(repoRoot: string, overrideDir?: string) {
  const legacy = path.join(repoRoot, LEGACY_ROOT_DIR);
  const next = getRalphyRoot(repoRoot, overrideDir);

  const legacyExists = await exists(legacy);
  const nextExists = await exists(next);

  if (!legacyExists || nextExists) return { migrated: false as const };

  await fse.copy(legacy, next, { overwrite: false, errorOnExist: false });
  return { migrated: true as const, from: legacy, to: next };
}

async function exists(p: string): Promise<boolean> {
  try {
    await fs.access(p);
    return true;
  } catch {
    return false;
  }
}

