import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { writeStatus } from "./status-writer";
import { FILES, getRalphyRoot } from "../folders";

describe("writeStatus", () => {
  it("includes backend/workspace and budget when provided", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ralphy-status-"));
    await writeStatus({
      repoRoot,
      runId: "run_1",
      backendId: "noop",
      workspaceMode: "patch",
      phase: "EXEC",
      taskId: "t1",
      iteration: 2,
      tier: "warning",
      budgetStatus: {
        tier: "warning",
        usedUsd: 1.23,
        usedTokens: 100,
        usedTimeMs: 1000,
        usedIterations: 2,
        usdPctOfOptimal: null,
        usdPctOfHard: null,
        tokensPctOfOptimal: null,
        tokensPctOfHard: null,
        timePctOfOptimal: null,
        timePctOfHard: null,
        isInWarning: true,
        isAtHardCap: false,
      },
    });

    const p = path.join(getRalphyRoot(repoRoot), FILES.status);
    const md = await fs.readFile(p, "utf8");
    expect(md).toContain("**backend**");
    expect(md).toContain("**workspace**");
    expect(md).toContain("## Budget");
  });
});

