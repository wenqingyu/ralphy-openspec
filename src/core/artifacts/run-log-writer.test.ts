import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { writeRunLogOnce } from "./run-log-writer";
import { FOLDERS, getRalphyRoot } from "../folders";

describe("writeRunLogOnce", () => {
  it("creates the run log once and does not overwrite", async () => {
    const repoRoot = await fs.mkdtemp(path.join(os.tmpdir(), "ralphy-runlog-"));
    const runId = "run_test";

    const first = await writeRunLogOnce({
      repoRoot,
      runId,
      outcome: { ok: true },
      ledgerEvents: [{ ts: "t", kind: "run_started", message: "Run started" }],
    });
    const second = await writeRunLogOnce({
      repoRoot,
      runId,
      outcome: { ok: false, exitCode: 4, reason: "nope" },
      ledgerEvents: [{ ts: "t2", kind: "run_error", message: "error" }],
    });

    expect(first.created).toBe(true);
    expect(second.created).toBe(false);

    const p = path.join(getRalphyRoot(repoRoot), FOLDERS.runs, `${runId}.md`);
    const md = await fs.readFile(p, "utf8");
    expect(md).toContain("# Run log");
    expect(md).toContain("run_started");
    expect(md).not.toContain("run_error");
  });
});

