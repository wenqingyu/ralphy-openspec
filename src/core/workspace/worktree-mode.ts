import { execa } from "execa";
import path from "node:path";
import fs from "node:fs/promises";
import type { FileContract } from "../spec/types";
import { FOLDERS, getRalphyRoot } from "../folders";
import { evaluateFileContract } from "../spec/file-contract";
import type {
  CheckpointRef,
  ContractViolation,
  WorkspaceContext,
  WorkspaceManager,
} from "./manager";

type WorktreeState = {
  worktreePath: string;
  branchName: string;
  baseCommit: string;
};

/**
 * WorktreeModeWorkspace uses git worktrees for task isolation.
 *
 * Each task runs in its own worktree branch, providing complete isolation
 * from the main working directory. Changes are merged back on success.
 */
export class WorktreeModeWorkspace implements WorkspaceManager {
  mode: "worktree" = "worktree";
  private readonly stateByTask = new Map<string, WorktreeState>();
  private readonly worktreeBase: string;

  constructor(private readonly repoRoot: string) {
    this.worktreeBase = path.join(getRalphyRoot(repoRoot), FOLDERS.worktrees);
  }

  async prepare(taskId: string): Promise<WorkspaceContext> {
    // Ensure worktree base directory exists
    await fs.mkdir(this.worktreeBase, { recursive: true });

    // Get current HEAD as base
    const baseCommit = await this.git(["rev-parse", "HEAD"], this.repoRoot);

    // Create a unique branch name for this task
    const branchName = `ralphy/${taskId}/${Date.now()}`;
    const worktreePath = path.join(this.worktreeBase, taskId.replace(/[^a-zA-Z0-9-_]/g, "_"));

    // Clean up existing worktree if present
    try {
      await fs.rm(worktreePath, { recursive: true, force: true });
    } catch {
      // Ignore if doesn't exist
    }

    // Remove stale worktree entry if any
    try {
      await this.git(["worktree", "remove", "--force", worktreePath], this.repoRoot);
    } catch {
      // Ignore if doesn't exist
    }

    // Create new worktree with a new branch
    await this.git(
      ["worktree", "add", "-b", branchName, worktreePath, baseCommit],
      this.repoRoot
    );

    this.stateByTask.set(taskId, { worktreePath, branchName, baseCommit });

    return { taskId, workingDir: worktreePath };
  }

  getWorkingDir(taskId: string): string {
    const state = this.stateByTask.get(taskId);
    return state?.worktreePath ?? this.repoRoot;
  }

  async getChangedFiles(taskId: string): Promise<Array<{ file: string; isNew: boolean }>> {
    const state = this.stateByTask.get(taskId);
    if (!state) return [];

    // Get changes compared to base commit
    const out = await this.git(
      ["diff", "--name-status", state.baseCommit],
      state.worktreePath
    );

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
      // Revert the worktree to base state
      await this.revert(taskId);
    }

    return violations;
  }

  async checkpoint(taskId: string, message: string): Promise<CheckpointRef> {
    const state = this.stateByTask.get(taskId);
    if (!state) {
      throw new Error(`No worktree state for task ${taskId}`);
    }

    // Stage and commit all changes in worktree
    await this.git(["add", "-A"], state.worktreePath);

    const commitMsg = `[ralphy-spec] ${taskId}: ${message}`;
    try {
      await this.git(["commit", "-m", commitMsg], state.worktreePath);
    } catch {
      // Likely nothing to commit
    }

    const ref = await this.git(["rev-parse", "HEAD"], state.worktreePath);
    return { ref };
  }

  async merge(taskId: string): Promise<void> {
    const state = this.stateByTask.get(taskId);
    if (!state) return;

    // Get the current branch in main repo
    const currentBranch = await this.git(
      ["rev-parse", "--abbrev-ref", "HEAD"],
      this.repoRoot
    );

    // Merge the task branch back using --squash for clean history
    try {
      await this.git(["merge", "--squash", state.branchName], this.repoRoot);
      await this.git(
        ["commit", "-m", `[ralphy-spec] Merge task ${taskId}`],
        this.repoRoot
      );
    } catch (err: any) {
      // If merge fails, user may need to resolve manually
      throw new Error(
        `Failed to merge task ${taskId}: ${err?.message ?? String(err)}. Manual resolution may be required.`
      );
    }
  }

  async revert(taskId: string): Promise<void> {
    const state = this.stateByTask.get(taskId);
    if (!state) return;

    // Hard reset worktree to base commit
    await this.git(["reset", "--hard", state.baseCommit], state.worktreePath);
    await this.git(["clean", "-fd"], state.worktreePath);
  }

  async cleanup(taskId: string): Promise<void> {
    const state = this.stateByTask.get(taskId);
    if (!state) return;

    try {
      // Remove the worktree
      await this.git(["worktree", "remove", "--force", state.worktreePath], this.repoRoot);

      // Delete the branch
      await this.git(["branch", "-D", state.branchName], this.repoRoot);
    } catch {
      // Best effort cleanup
    }

    this.stateByTask.delete(taskId);
  }

  private async git(args: string[], cwd: string): Promise<string> {
    const res = await execa("git", args, {
      cwd,
      stdio: "pipe",
      reject: false,
    });

    if (res.exitCode !== 0 && res.stderr) {
      throw new Error(`git ${args.join(" ")} failed: ${res.stderr}`);
    }

    return res.stdout.trim();
  }
}
