import { execa } from "execa";
import type { BackendEnv, CodingBackend, ImplementInput, ImplementOutput } from "./types";
import { writeBackendLog } from "./log-writer";

/**
 * ClaudeCodeBackend shells out to the `claude` CLI for code implementation.
 *
 * Claude Code (Anthropic's coding assistant) supports headless operation
 * via the claude CLI with --print or --output-format json flags.
 */
export class ClaudeCodeBackend implements CodingBackend {
  readonly id = "claude-code";

  constructor(private readonly opts: { timeoutMs?: number } = {}) {}

  async implement(env: BackendEnv, input: ImplementInput): Promise<ImplementOutput> {
    const { task, iteration, repairNotes } = input;

    // Build the prompt to send to Claude Code
    const prompt = this.buildPrompt(task, iteration, repairNotes);

    try {
      const startedAt = new Date().toISOString();
      // Claude CLI: `claude --print "prompt"` for headless operation
      // The --print flag runs claude non-interactively
      const command = "claude";
      const argv = ["--print", prompt];

      // Use task budget time limit if available, otherwise fall back to default or constructor option
      const taskTimeoutMs =
        task.budget?.hard?.timeMinutes !== undefined
          ? task.budget.hard.timeMinutes * 60_000
          : this.opts.timeoutMs ?? 600_000; // 10 min default

      const subprocess = execa(command, argv, {
        cwd: env.cwd,
        timeout: taskTimeoutMs,
        reject: false,
        stdio: "pipe",
      });
      if (env.stream) {
        subprocess.stdout?.pipe(process.stdout);
        subprocess.stderr?.pipe(process.stderr);
      }

      const result = await subprocess;
      const finishedAt = new Date().toISOString();
      const timedOut = (result as any).timedOut === true;

      if (env.logFile) {
        await writeBackendLog({
          logFile: env.logFile,
          backendId: env.backendId,
          cwd: env.cwd,
          command,
          argv: ["--print", "<prompt redacted>"],
          startedAt,
          finishedAt,
          exitCode: result.exitCode ?? null,
          timedOut,
          timeoutMs: taskTimeoutMs,
          stdout: result.stdout,
          stderr: result.stderr,
        });
      }

      if (result.exitCode === 0) {
        return {
          ok: true,
          message: `Claude Code completed task "${task.id}" (iteration ${iteration})`,
        };
      }

      // Handle timeout explicitly
      if (timedOut || (result.exitCode === 143 && !result.stdout && !result.stderr)) {
        const timeoutMinutes = Math.floor(taskTimeoutMs / 60_000);
        return {
          ok: false,
          message: `Claude Code timed out after ${timeoutMinutes} minute(s). The task budget allows ${task.budget?.hard?.timeMinutes ?? "N/A"} minutes. ${
            task.budget?.hard?.timeMinutes && taskTimeoutMs >= task.budget.hard.timeMinutes * 60_000
              ? "Consider breaking the task into smaller subtasks or increasing the task's hard.time_minutes budget."
              : "The task may be too complex or Claude Code may need more time. Check the backend log for details."
          }`,
        };
      }

      // Non-zero exit code (not a timeout)
      return {
        ok: false,
        message: `Claude Code exited with code ${result.exitCode}: ${result.stderr || result.stdout}`.slice(
          0,
          2000
        ),
      };
    } catch (err: any) {
      // Handle cases where claude CLI is not available
      if (err?.code === "ENOENT") {
        return {
          ok: false,
          message:
            "Claude CLI not found. Please ensure Claude Code is installed and the CLI is in PATH.",
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

    if (repairNotes) {
      lines.push(`## Repair Notes (iteration ${iteration})`);
      lines.push(repairNotes);
      lines.push(``);
    }

    lines.push(`Please implement this task and ensure all validators pass.`);

    return lines.join("\n");
  }
}
