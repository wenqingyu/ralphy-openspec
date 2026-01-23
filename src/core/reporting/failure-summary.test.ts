import { describe, expect, it } from "vitest";
import { buildFailureSummary } from "./failure-summary";

describe("buildFailureSummary", () => {
  it("includes required sections", () => {
    const md = buildFailureSummary({
      runId: "run_123",
      taskId: "task_a",
      reason: "Hard cap reached",
      tier: "hard",
      lastIssues: [{ message: "Boom", level: "error", kind: "test", file: "a.ts" }],
      suggestedSteps: ["Do X", "Do Y"],
    });

    expect(md).toContain("# Task blocked");
    expect(md).toContain("## Last issues");
    expect(md).toContain("## Suggested manual steps");
    expect(md).toContain("Hard cap reached");
    expect(md).toContain("Boom");
  });
});

