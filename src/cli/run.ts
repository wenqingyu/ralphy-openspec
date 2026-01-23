import type { Command } from "commander";
import path from "node:path";
import { SpecLoader } from "../core/spec/loader";
import { buildTaskDAG } from "../core/spec/dag";
import { NoopBackend } from "../core/backends/noop";
import { PatchModeWorkspace } from "../core/workspace/patch-mode";
import { EngineLoop } from "../core/engine/loop";

export function registerRunCommand(program: Command): void {
  program
    .command("run")
    .description("Execute the ralphy-spec engine loop")
    .option("--backend <id>", "Backend id: cursor|opencode|claude-code", "cursor")
    .option("--workspace <mode>", "Workspace mode: worktree|patch", "patch")
    .option("--task <taskId>", "Run a single task (skips dependency checks)")
    .option("--dry-run", "Validate spec and print plan only", false)
    .option("--json", "Machine-readable output", false)
    .action(
      async (opts: {
        backend: string;
        workspace: "worktree" | "patch";
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

        if (opts.workspace === "worktree") {
          process.stderr.write(
            `Workspace mode "worktree" is not implemented in this MVP. Use --workspace patch.\n`
          );
          process.exitCode = 6;
          return;
        }

        const backend = new NoopBackend(opts.backend);
        const workspace = new PatchModeWorkspace(path.resolve(repoRoot));

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

