import { execa } from "execa";
import path from "node:path";
import type { FileContract } from "../spec/types";
import { evaluateFileContract } from "../spec/file-contract";
import type {
  CheckpointRef,
  ContractViolation,
  WorkspaceContext,
  WorkspaceManager,
} from "./manager";

type PatchModeState = {
  snapshotCommit: string;
};

export class PatchModeWorkspace implements WorkspaceManager {
  mode: "patch" = "patch";
  private readonly stateByTask = new Map<string, PatchModeState>();

  constructor(private readonly repoRoot: string) {}

  async prepare(taskId: string): Promise<WorkspaceContext> {
    const snapshotCommit = await this.git(["rev-parse", "HEAD"]);
    this.stateByTask.set(taskId, { snapshotCommit });
    return { taskId, workingDir: this.repoRoot };
  }

  getWorkingDir(_taskId: string): string {
    return this.repoRoot;
  }

  async getChangedFiles(_taskId: string): Promise<Array<{ file: string; isNew: boolean }>> {
    // name-status gives: A/M/D/R... <path> ...
    const out = await this.git(["diff", "--name-status"]);
    const lines = out
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const changed: Array<{ file: string; isNew: boolean }> = [];
    for (const line of lines) {
      const parts = line.split(/\s+/);
      const status = parts[0] ?? "";
      const file = parts[1] ?? "";
      if (!file) continue;
      changed.push({ file, isNew: status.startsWith("A") });
    }
    return changed;
  }

  async enforceContract(taskId: string, contract: FileContract): Promise<ContractViolation[]> {
    const changedFiles = await this.getChangedFiles(taskId);
    const violations = evaluateFileContract({ changedFiles, contract });
    if (violations.length) {
      await this.revert(taskId);
    }
    return violations;
  }

  async checkpoint(taskId: string, message: string): Promise<CheckpointRef> {
    // Best effort: commit all changes. If nothing to commit, return HEAD.
    await this.git(["add", "-A"]);
    const commitMsg = `[ralphy-spec] ${taskId}: ${message}`;
    try {
      await this.git(["commit", "-m", commitMsg]);
    } catch {
      // likely "nothing to commit"
    }
    const ref = await this.git(["rev-parse", "HEAD"]);
    return { ref };
  }

  async merge(_taskId: string): Promise<void> {
    // Patch mode executes on main; merge is no-op.
  }

  async revert(taskId: string): Promise<void> {
    const state = this.stateByTask.get(taskId);
    if (!state) return;

    // Hard revert to snapshot; also remove untracked files.
    await this.git(["reset", "--hard", state.snapshotCommit]);
    await this.git(["clean", "-fd"]);
  }

  async cleanup(_taskId: string): Promise<void> {
    // No-op for patch mode.
  }

  private async git(args: string[]): Promise<string> {
    const res = await execa("git", args, {
      cwd: this.repoRoot,
      stdio: "pipe",
    });
    return res.stdout.trim();
  }
}

export function getPatchWorkspaceRoot(repoRoot: string): string {
  return path.resolve(repoRoot);
}

