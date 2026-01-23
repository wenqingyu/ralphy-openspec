import { execa } from "execa";
import type { BackendEnv, CodingBackend, ImplementInput, ImplementOutput } from "./types";
import { writeBackendLog } from "./log-writer";

/**
 * CursorBackend shells out to the `cursor` CLI for code implementation.
 *
 * Note: Cursor IDE typically runs interactively. This backend sends prompts
 * via the CLI and expects the user/AI to complete the task.
 */
export class CursorBackend implements CodingBackend {
  readonly id = "cursor";

  constructor(private readonly opts: { timeoutMs?: number } = {}) {}

  async implement(env: BackendEnv, input: ImplementInput): Promise<ImplementOutput> {
    const { task, iteration, repairNotes } = input;

    // Build the prompt to send to Cursor Agent
    const prompt = this.buildPrompt(task, iteration, repairNotes);

    try {
      const startedAt = new Date().toISOString();
      /**
       * Cursor 2.x CLI provides `cursor agent` (headless) which is suitable for this backend.
       *
       * Notes:
       * - Requires authentication: `cursor agent login` OR `CURSOR_API_KEY`.
       * - `--print` makes it usable from scripts/non-interactive terminals.
       * - `--workspace` ensures the agent operates on the task working directory.
       */
      const command = "cursor";
      const argv = [
        "agent",
        "--print",
        "--output-format",
        "text",
        "--workspace",
        env.cwd,
        prompt,
      ];

      // Use task budget time limit if available, otherwise fall back to default or constructor option
      const taskTimeoutMs =
        task.budget?.hard?.timeMinutes !== undefined
          ? task.budget.hard.timeMinutes * 60_000
          : this.opts.timeoutMs ?? 600_000; // 10 min default

      const subprocess = execa(
        command,
        argv,
        {
          cwd: env.cwd,
          timeout: taskTimeoutMs,
          reject: false,
          stdio: "pipe",
        }
      );

      if (env.stream) {
        subprocess.stdout?.pipe(process.stdout);
        subprocess.stderr?.pipe(process.stderr);
      }

      const result = await subprocess;
      const finishedAt = new Date().toISOString();
      const combined = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
      const timedOut = (result as any).timedOut === true;

      if (env.logFile) {
        await writeBackendLog({
          logFile: env.logFile,
          backendId: env.backendId,
          cwd: env.cwd,
          command,
          argv: argv.map((a, i) => (i === argv.length - 1 ? "<prompt redacted>" : a)),
          startedAt,
          finishedAt,
          exitCode: result.exitCode ?? null,
          timedOut,
          timeoutMs: taskTimeoutMs,
          stdout: result.stdout,
          stderr: result.stderr,
        });
      }

      // Cursor Agent auth failures (common on first run)
      if (result.exitCode !== 0 && /(not logged in|authentication required)/i.test(combined)) {
        return {
          ok: false,
          message:
            "Cursor Agent is not authenticated. Run `cursor agent login` (interactive) or set CURSOR_API_KEY, then retry.",
        };
      }

      if (result.exitCode === 0) {
        return {
          ok: true,
          message: `Cursor Agent completed task "${task.id}" (iteration ${iteration})`,
        };
      }

      // Handle timeout explicitly
      if (timedOut || (result.exitCode === 143 && !combined)) {
        const timeoutMinutes = Math.floor(taskTimeoutMs / 60_000);
        return {
          ok: false,
          message: `Cursor Agent timed out after ${timeoutMinutes} minute(s). The task budget allows ${task.budget?.hard?.timeMinutes ?? "N/A"} minutes. ${
            task.budget?.hard?.timeMinutes && taskTimeoutMs >= task.budget.hard.timeMinutes * 60_000
              ? "Consider breaking the task into smaller subtasks or increasing the task's hard.time_minutes budget."
              : "The task may be too complex or Cursor Agent may need more time. Check the backend log for details."
          }`,
        };
      }

      // Non-zero exit code (not a timeout)
      return {
        ok: false,
        message: `Cursor Agent exited with code ${result.exitCode}: ${
          combined || "(no output)"
        }${
          result.exitCode === 143
            ? " (process was terminated; may indicate a crash or external kill signal)"
            : ""
        }`.slice(
          0,
          2000
        ),
      };
    } catch (err: any) {
      // Handle cases where cursor CLI is not available
      if (err?.code === "ENOENT") {
        return {
          ok: false,
          message:
            "Cursor CLI not found. Install Cursor and enable its shell command so `cursor` is in PATH.",
        };
      }

      return {
        ok: false,
        message: err?.message ? String(err.message).slice(0, 2000) : "Unknown error",
      };
    }
  }

  private buildPrompt(
    task: { id: string; title?: string; goal?: string },
    iteration: number,
    repairNotes?: string
  ): string {
    const lines: string[] = [];

    lines.push(`# Task: ${task.title ?? task.id}`);
    lines.push(``);

    if (task.goal) {
      lines.push(`## Goal`);
      lines.push(task.goal);
      lines.push(``);
    }

    lines.push(`## Where to read context`);
    lines.push(
      [
        `- Read OpenSpec: \`openspec/project.yml\` and any relevant files under \`openspec/specs/**\`.`,
        `- Read task context: \`ralphy-spec/tasks/${task.id}/CONTEXT.md\`.`,
        `- If present, read repair notes: \`ralphy-spec/tasks/${task.id}/REPAIR.md\`.`,
      ].join("\n")
    );
    lines.push(``);

    if (repairNotes) {
      lines.push(`## Repair Notes (iteration ${iteration})`);
      lines.push(repairNotes);
      lines.push(``);
    }

    lines.push(`## Instructions`);
    lines.push(`- Implement the task in this workspace and ensure all configured validators pass.`);
    lines.push(`- Keep changes within the task file contract / scope guard constraints.`);

    return lines.join("\n");
  }
}
