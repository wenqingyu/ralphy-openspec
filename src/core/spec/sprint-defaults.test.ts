import { describe, expect, it } from "vitest";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { SPRINT_SIZE_DEFAULTS, mergeBudgetDefaults } from "./sprint-defaults";
import { SpecLoader } from "./loader";

describe("SPRINT_SIZE_DEFAULTS", () => {
  it("provides hard.maxIterations for all sizes", () => {
    for (const [size, budget] of Object.entries(SPRINT_SIZE_DEFAULTS)) {
      expect(budget.hard?.maxIterations, `missing hard.maxIterations for ${size}`).toBeTypeOf(
        "number"
      );
    }
  });
});

describe("mergeBudgetDefaults", () => {
  it("fills missing tiers but preserves explicit overrides", () => {
    const defaults = SPRINT_SIZE_DEFAULTS.M;
    const merged = mergeBudgetDefaults(
      { optimal: { usd: 9.99 }, hard: { maxIterations: 2 } },
      defaults
    );

    expect(merged.optimal?.usd).toBe(9.99);
    expect(merged.warning?.usd).toBe(defaults.warning?.usd);
    expect(merged.hard?.usd).toBe(defaults.hard?.usd);
    expect(merged.hard?.maxIterations).toBe(2);
  });
});

describe("SpecLoader sprint defaults", () => {
  it("applies sprint size defaults when budget is absent", async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), "ralphy-spec-"));
    await fs.mkdir(path.join(tmp, "openspec"), { recursive: true });
    await fs.writeFile(
      path.join(tmp, "openspec", "project.yml"),
      [
        "version: '1.0'",
        "project:",
        "  name: demo",
        "defaults:",
        "  backend: noop",
        "tasks:",
        "  - id: t1",
        "    sprint:",
        "      size: M",
      ].join("\n"),
      "utf8"
    );

    const loader = new SpecLoader(tmp);
    const spec = await loader.loadProjectSpec();
    const t1 = spec.tasks.find((t) => t.id === "t1");
    expect(t1?.budget?.hard?.maxIterations).toBe(SPRINT_SIZE_DEFAULTS.M.hard?.maxIterations);
    expect(t1?.budget?.hard?.usd).toBe(SPRINT_SIZE_DEFAULTS.M.hard?.usd);
  });
});

