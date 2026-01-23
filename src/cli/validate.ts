import type { Command } from "commander";
import type { ToolId } from "../types";
import { detectExistingTools } from "../utils/detector";
import { resolveProjectDir } from "../utils/paths";
import { validateProject } from "../utils/validator";
import { SpecLoader } from "../core/spec/loader";
import { ValidatorRunner } from "../core/validators/runner";

function parseToolsArg(arg?: string): ToolId[] | undefined {
  if (!arg) return undefined;
  const parts = arg
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const allowed: ToolId[] = ["cursor", "claude-code", "opencode"];
  const tools: ToolId[] = [];
  for (const p of parts) {
    if ((allowed as string[]).includes(p)) tools.push(p as ToolId);
  }
  return tools.length ? tools : undefined;
}

export function registerValidateCommand(program: Command): void {
  program
    .command("validate")
    .description("Validate that Ralph-OpenSpec setup is complete")
    .option("--dir <path>", "Target project directory (default: current directory)")
    .option("--task <taskId>", "Validate a specific task via validators (v2)")
    .option(
      "--tools <list>",
      "Comma-separated list: cursor,claude-code,opencode (default: detect)"
    )
    .action(async (opts: { dir?: string; tools?: string; task?: string }) => {
      const dir = resolveProjectDir(opts.dir);

      if (opts.task) {
        try {
          const loader = new SpecLoader(dir);
          const spec = await loader.loadProjectSpec();
          const task = (spec.tasks ?? []).find((t) => t.id === opts.task);
          if (!task) {
            process.stderr.write(`Unknown task id: ${opts.task}\n`);
            process.exitCode = 4;
            return;
          }

          const ids = task.validators ?? spec.defaults.validators ?? [];
          const validators =
            (spec.validators ?? [])
              .filter((v) => ids.includes(v.id))
              .map((v) => ({
                id: v.id,
                run: v.run,
                timeoutMs: v.timeoutSeconds ? v.timeoutSeconds * 1000 : undefined,
                parser: v.parser,
              })) ?? [];

          const runner = new ValidatorRunner({
            cwd: dir,
            commandTimeoutMs: (spec.budgets?.limits?.commandTimeoutSeconds ?? 900) * 1000,
          });
          const results = await runner.runAll(validators);
          process.stdout.write(JSON.stringify({ ok: true, taskId: task.id, results }, null, 2) + "\n");
          const hasErrors = Object.values(results).some((r) => !r.ok);
          process.exitCode = hasErrors ? 1 : 0;
          return;
        } catch (e: any) {
          process.stderr.write(e?.message ? String(e.message) : String(e));
          process.stderr.write("\n");
          process.exitCode = 4;
          return;
        }
      }

      const tools = parseToolsArg(opts.tools) ?? (await detectExistingTools(dir));
      const issues = await validateProject(dir, tools);

      if (!issues.length) {
        process.stdout.write("OK: Ralph-OpenSpec setup looks good.\n");
        return;
      }

      for (const issue of issues) {
        const prefix = issue.level === "error" ? "ERROR" : "WARN";
        process.stdout.write(
          `${prefix}: ${issue.message}${issue.path ? ` (${issue.path})` : ""}\n`
        );
      }

      const hasErrors = issues.some((i) => i.level === "error");
      process.exitCode = hasErrors ? 1 : 0;
    });
}

