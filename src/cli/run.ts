import type { Command } from "commander";
import path from "node:path";
import { SpecLoader } from "../core/spec/loader";
import { buildTaskDAG } from "../core/spec/dag";
import { ClaudeCodeBackend } from "../core/backends/claude-code";
import { CursorBackend } from "../core/backends/cursor";
import { NoopBackend } from "../core/backends/noop";
import { OpenCodeBackend } from "../core/backends/opencode";
import { PatchModeWorkspace } from "../core/workspace/patch-mode";
import { WorktreeModeWorkspace } from "../core/workspace/worktree-mode";
import { EngineLoop } from "../core/engine/loop";

function createBackend(id: string) {
  switch (id) {
    case "cursor":
      return new CursorBackend();
    case "opencode":
      return new OpenCodeBackend();
    case "claude-code":
      return new ClaudeCodeBackend();
    case "noop":
      return new NoopBackend("noop");
    default:
      // Fallback: treat as noop for unknown ids (but retain id for diagnostics).
      return new NoopBackend(id);
  }
}

export function registerRunCommand(program: Command): void {
  program
    .command("run")
    .description("Execute the ralphy-spec engine loop")
    .option("--backend <id>", "Backend id: cursor|opencode|claude-code|noop")
    .option("--workspace <mode>", "Workspace mode: worktree|patch")
    .option("--artifact-dir <dir>", "Override artifact root directory (enables artifacts)")
    .option("--task <taskId>", "Run a single task (skips dependency checks)")
    .option("--dry-run", "Validate spec and print plan only", false)
    .option("--json", "Machine-readable output", false)
    .addHelpText(
      "after",
      `\nConcepts:\n` +
        `- Budget tiers: optimal -> warning -> hard. WARNING enables degrade behaviors; HARD blocks the task.\n` +
        `- Sprint sizing: XS/S/M/L/XL (optional per task via sprint.size).\n` +
        `- Sprint intent: fix|feature|refactor|infra (optional per task via sprint.intent).\n`
    )
    .action(
      async (opts: {
        backend?: string;
        workspace?: "worktree" | "patch";
        artifactDir?: string;
        task?: string;
        dryRun: boolean;
        json: boolean;
      }) => {
        const repoRoot = process.cwd();
        const loader = new SpecLoader(repoRoot);

        let spec;
        try {
          spec = await loader.loadProjectSpec();
        } catch (e: any) {
          process.stderr.write(e?.message ? String(e.message) : String(e));
          process.stderr.write("\n");
          process.exitCode = 4;
          return;
        }

        if (opts.artifactDir) {
          spec = {
            ...spec,
            artifacts: {
              ...(spec.artifacts ?? {}),
              enabled: true,
              rootDir: opts.artifactDir,
            },
          };
        }

        // Always build DAG in run/dry-run to validate deps/cycles unless --task is used.
        try {
          if (!opts.task) buildTaskDAG(spec.tasks ?? []);
        } catch (e: any) {
          process.stderr.write(e?.message ? String(e.message) : String(e));
          process.stderr.write("\n");
          process.exitCode = 4;
          return;
        }

        if (opts.dryRun) {
          const dag = buildTaskDAG(spec.tasks ?? []);
          const plan = opts.task ? [opts.task] : dag.order;
          const out = { ok: true, dryRun: true, plan };
          process.stdout.write(opts.json ? JSON.stringify(out, null, 2) + "\n" : `${plan.join("\n")}\n`);
          return;
        }

        const backendId = opts.backend ?? spec.defaults.backend ?? "cursor";
        const workspaceMode = opts.workspace ?? spec.defaults.workspaceMode ?? "patch";

        const backend = createBackend(backendId);
        const workspace =
          workspaceMode === "worktree"
            ? new WorktreeModeWorkspace(path.resolve(repoRoot))
            : new PatchModeWorkspace(path.resolve(repoRoot));

        const engine = new EngineLoop();
        const outcome = await engine.run({
          repoRoot,
          spec,
          backend,
          workspace,
          taskId: opts.task,
          dryRun: false,
          json: opts.json,
        });

        if (opts.json) {
          process.stdout.write(JSON.stringify(outcome, null, 2) + "\n");
        } else {
          process.stdout.write(outcome.ok ? `OK: ${outcome.runId}\n` : `STOP: ${outcome.runId} (${outcome.exitCode}) ${outcome.reason}\n`);
        }

        process.exitCode = outcome.ok ? 0 : outcome.exitCode;
      }
    );
}

