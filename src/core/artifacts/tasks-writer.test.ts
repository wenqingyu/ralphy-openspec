import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { writeTasksBoard } from "./tasks-writer";
import { FILES, getRalphyRoot } from "../folders";

describe("writeTasksBoard", () => {
  it("writes TASKS.md with configurable icon mode", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ralphy-artifacts-"));
    await writeTasksBoard({
      repoRoot,
      runId: "run_1",
      statusIcons: "ascii",
      specTasks: [{ id: "t1", title: "Hello" } as any],
      rows: [{ taskId: "t1", status: "running", iteration: 2 }],
    });

    const tasksPath = path.join(getRalphyRoot(repoRoot), FILES.tasks);
    const md = await fs.readFile(tasksPath, "utf8");
    expect(md).toContain("# TASKS");
    expect(md).toContain("[~] running");
  });
});

