import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { EngineLoop } from "./loop";
import { NoopBackend } from "../backends/noop";
import type { WorkspaceContext, WorkspaceManager } from "../workspace/manager";
import type { ProjectSpec } from "../spec/types";

class ScopeWorkspace implements WorkspaceManager {
  mode: "patch" = "patch";
  constructor(private readonly cwd: string) {}
  async prepare(taskId: string): Promise<WorkspaceContext> {
    return { taskId, workingDir: this.cwd };
  }
  getWorkingDir(): string {
    return this.cwd;
  }
  async getChangedFiles(): Promise<Array<{ file: string; isNew: boolean }>> {
    // Pretend the backend changed an unrelated file.
    return [{ file: "unrelated.txt", isNew: true }];
  }
  async enforceContract(): Promise<any[]> {
    return [];
  }
  async checkpoint(): Promise<{ ref: string }> {
    return { ref: "noop" };
  }
  async merge(): Promise<void> {}
  async revert(): Promise<void> {}
  async cleanup(): Promise<void> {}
}

describe("scope guard policy", () => {
  it("does not block when scopeGuard=warn", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ralphy-scope-"));
    const spec: ProjectSpec = {
      version: "1.1",
      project: { name: "tmp", repoRoot: "." },
      defaults: { backend: "noop", workspaceMode: "patch", checkpointMode: "commit", validators: [] },
      policies: { scopeGuard: "warn" },
      budgets: { limits: { commandTimeoutSeconds: 5 } },
      validators: [],
      tasks: [{ id: "t1", sprint: { size: "XS", intent: "fix" } }],
      artifacts: { enabled: false },
    };

    const outcome = await new EngineLoop().run({
      repoRoot: tmp,
      spec,
      backend: new NoopBackend("noop"),
      workspace: new ScopeWorkspace(tmp),
      dryRun: false,
      json: true,
    });

    // With warn, the scope violation is a warning and should not fail the run by itself.
    expect(outcome.ok).toBe(true);
  });

  it("blocks when scopeGuard=block", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ralphy-scope-"));
    const spec: ProjectSpec = {
      version: "1.1",
      project: { name: "tmp", repoRoot: "." },
      defaults: { backend: "noop", workspaceMode: "patch", checkpointMode: "commit", validators: [] },
      policies: { scopeGuard: "block" },
      budgets: { limits: { commandTimeoutSeconds: 5 } },
      validators: [],
      tasks: [{ id: "t1", sprint: { size: "XS", intent: "fix" } }],
      artifacts: { enabled: false },
    };

    const outcome = await new EngineLoop().run({
      repoRoot: tmp,
      spec,
      backend: new NoopBackend("noop"),
      workspace: new ScopeWorkspace(tmp),
      dryRun: false,
      json: true,
    });

    expect(outcome.ok).toBe(false);
  });
});

