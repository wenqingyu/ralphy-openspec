import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { EngineLoop } from "./loop";
import { NoopBackend } from "../backends/noop";
import type { WorkspaceContext, WorkspaceManager } from "../workspace/manager";
import type { ProjectSpec } from "../spec/types";

class MemoryWorkspace implements WorkspaceManager {
  mode: "patch" = "patch";
  constructor(private readonly cwd: string) {}
  async prepare(taskId: string): Promise<WorkspaceContext> {
    return { taskId, workingDir: this.cwd };
  }
  getWorkingDir(): string {
    return this.cwd;
  }
  async getChangedFiles(): Promise<Array<{ file: string; isNew: boolean }>> {
    return [];
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

describe("EngineLoop hard cap blocking", () => {
  it("blocks a task at hard cap without silent retries", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ralphy-loop-"));
    await fs.mkdir(path.join(tmp, "openspec"), { recursive: true });
    // Minimal openspec/project.yml is not required because we pass spec directly,
    // but the persistence layer expects a repoRoot folder to exist.

    const spec: ProjectSpec = {
      version: "1.1",
      project: { name: "tmp", repoRoot: "." },
      defaults: { backend: "noop", workspaceMode: "patch", checkpointMode: "commit", validators: [] },
      budgets: { limits: { commandTimeoutSeconds: 5 } },
      validators: [
        { id: "failfast", run: 'node -e "process.exit(1)"', timeoutSeconds: 5, parser: "jest" },
      ],
      tasks: [
        {
          id: "t1",
          title: "Hard cap test",
          validators: ["failfast"],
          budget: { hard: { maxIterations: 1 } },
        },
      ],
      artifacts: { enabled: false },
    };

    const engine = new EngineLoop();
    const outcome = await engine.run({
      repoRoot: tmp,
      spec,
      backend: new NoopBackend("noop"),
      workspace: new MemoryWorkspace(tmp),
      dryRun: false,
      json: true,
    });

    expect(outcome.ok).toBe(false);
    if (!outcome.ok) {
      expect(outcome.exitCode).toBe(2);
      expect(outcome.reason).toContain("Hard cap");
    }
  });
});

