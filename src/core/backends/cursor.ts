import { execa } from "execa";
import fs from "node:fs/promises";
import path from "node:path";
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

    const startedAt = new Date().toISOString();
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

    let result: any = null;
    let logWritten = false;
    let stdout = "";
    let stderr = "";
    let lastActivity = Date.now();
    let activityInterval: NodeJS.Timeout | null = null;

    // Real-time log file writer (if logFile is provided)
    let logFileHandle: Awaited<ReturnType<typeof fs.open>> | null = null;
    if (env.logFile) {
      try {
        await fs.mkdir(path.dirname(env.logFile), { recursive: true });
        logFileHandle = await fs.open(env.logFile, "w");
        // Write header immediately
        await logFileHandle.write(
          `# Backend log (real-time)\n\n- startedAt: ${startedAt}\n- backend: ${env.backendId}\n- cwd: ${env.cwd}\n- command: ${command}\n- argv: ${JSON.stringify(argv.map((a, i) => (i === argv.length - 1 ? "<prompt redacted>" : a)))}\n- timeoutMs: ${taskTimeoutMs} (${Math.floor(taskTimeoutMs / 60_000)} minutes)\n\n## Real-time output\n\n`
        );
      } catch {
        logFileHandle = null;
      }
    }

    // Helper to append to log file in real-time
    const appendLog = async (text: string, stream: "stdout" | "stderr" = "stdout") => {
      if (logFileHandle) {
        try {
          const prefix = stream === "stdout" ? "[OUT] " : "[ERR] ";
          await logFileHandle.write(prefix + text.replace(/\n/g, "\n" + prefix));
        } catch {
          // Ignore write errors
        }
      }
    };

    // Helper to extract and report agent activity
    const reportActivity = (line: string) => {
      // Look for common patterns in agent output
      const lower = line.toLowerCase();
      if (lower.includes("thinking") || lower.includes("analyzing") || lower.includes("reasoning")) {
        return "Agent is thinking/analyzing...";
      }
      if (lower.includes("executing") || lower.includes("running") || lower.match(/^\$|^>|^npm |^git |^node |^tsc |^jest |^eslint /)) {
        // Extract command if possible
        const cmdMatch = line.match(/(?:executing|running|^)\s*([$>]\s*)?([^\n]+)/);
        if (cmdMatch) {
          return `Agent executing: ${cmdMatch[2].slice(0, 80)}`;
        }
        return "Agent executing command...";
      }
      if (lower.includes("reading") || lower.includes("checking") || lower.includes("reviewing")) {
        return "Agent reading/checking files...";
      }
      if (lower.includes("writing") || lower.includes("creating") || lower.includes("modifying")) {
        return "Agent modifying files...";
      }
      return null;
    };

    try {
      /**
       * Cursor 2.x CLI provides `cursor agent` (headless) which is suitable for this backend.
       *
       * Notes:
       * - Requires authentication: `cursor agent login` OR `CURSOR_API_KEY`.
       * - `--print` makes it usable from scripts/non-interactive terminals.
       * - `--workspace` ensures the agent operates on the task working directory.
       */
      const subprocess = execa(
        command,
        argv,
        {
          cwd: env.cwd,
          timeout: taskTimeoutMs,
          reject: false,
          stdio: ["ignore", "pipe", "pipe"], // stdin: ignore, stdout/stderr: pipe
          env: {
            ...process.env,
            // Try to force unbuffered output (may help with some tools)
            PYTHONUNBUFFERED: "1",
            NODE_NO_WARNINGS: "1",
          },
        }
      );

      // Capture stdout in real-time (before piping)
      if (subprocess.stdout) {
        subprocess.stdout.on("data", async (chunk: Buffer) => {
          const text = chunk.toString();
          stdout += text;
          await appendLog(text, "stdout");

          // Report activity every 5 seconds if there's new output
          const now = Date.now();
          if (now - lastActivity > 5000) {
            lastActivity = now;
            const activity = reportActivity(text);
            if (activity && env.stream) {
              process.stderr.write(`[ralphy-spec] ${activity}\n`);
            }
          }

          // Also forward to terminal if streaming is enabled
          if (env.stream) {
            process.stdout.write(chunk);
          }
        });
      }

      // Capture stderr in real-time (before piping)
      if (subprocess.stderr) {
        subprocess.stderr.on("data", async (chunk: Buffer) => {
          const text = chunk.toString();
          stderr += text;
          await appendLog(text, "stderr");

          // Also forward to terminal if streaming is enabled
          if (env.stream) {
            process.stderr.write(chunk);
          }
        });
      }

      result = await subprocess;
    } catch (err: any) {
      const finishedAt = new Date().toISOString();

      // Close real-time log file
      if (logFileHandle) {
        try {
          await logFileHandle.write(`\n\n## Summary\n\n- finishedAt: ${finishedAt}\n- exitCode: null (error)\n- error: ${err?.message || String(err) || "Process was interrupted or crashed"}\n`);
          await logFileHandle.close();
          logFileHandle = null;
        } catch {
          // Ignore close errors
        }
      }

      // Always write log on error (best effort)
      if (env.logFile && !logWritten) {
        try {
          await writeBackendLog({
            logFile: env.logFile,
            backendId: env.backendId,
            cwd: env.cwd,
            command,
            argv: argv.map((a, i) => (i === argv.length - 1 ? "<prompt redacted>" : a)),
            startedAt,
            finishedAt,
            exitCode: null,
            timedOut: false,
            timeoutMs: taskTimeoutMs,
            stdout: stdout || "",
            stderr: stderr || err?.message || String(err) || "Process was interrupted or crashed",
          });
          logWritten = true;
        } catch {
          // Ignore log write errors
        }
      }

      // Handle cases where cursor CLI is not available
      if (err?.code === "ENOENT") {
        return {
          ok: false,
          message:
            "Cursor CLI not found. Install Cursor and enable its shell command so `cursor` is in PATH.",
        };
      }

      // Handle process interruption (SIGTERM, SIGKILL, etc.)
      if (err?.signal || err?.code === "SIGTERM" || err?.code === "SIGKILL") {
        return {
          ok: false,
          message: `Cursor Agent process was interrupted (signal: ${err.signal || err.code}). This may indicate the process was killed externally or the system ran out of resources. Check the backend log for details.`,
        };
      }

      return {
        ok: false,
        message: `Cursor Agent error: ${err?.message ? String(err.message).slice(0, 2000) : "Unknown error"}. Check the backend log for details.`,
      };
    }

    // Normal completion path
    const finishedAt = new Date().toISOString();
    // Use captured stdout/stderr (from real-time capture) or fall back to result
    stdout = stdout || result?.stdout || "";
    stderr = stderr || result?.stderr || "";
    const combined = [stdout, stderr].filter(Boolean).join("\n").trim();
    const timedOut = result ? (result as any).timedOut === true : false;
    const exitCode = result?.exitCode ?? null;

    // Close real-time log file and append summary
    if (logFileHandle) {
      try {
        const durationMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime();
        await logFileHandle.write(
          `\n\n## Summary\n\n- finishedAt: ${finishedAt}\n- duration: ${Math.floor(durationMs / 1000)}s\n- exitCode: ${exitCode ?? "null"}\n- timedOut: ${timedOut}\n`
        );
        await logFileHandle.close();
        logFileHandle = null;
      } catch {
        // Ignore close errors
      }
    }

    // Always write log (best effort) - this creates a complete snapshot
    if (env.logFile && !logWritten) {
      try {
        await writeBackendLog({
          logFile: env.logFile,
          backendId: env.backendId,
          cwd: env.cwd,
          command,
          argv: argv.map((a, i) => (i === argv.length - 1 ? "<prompt redacted>" : a)),
          startedAt,
          finishedAt,
          exitCode,
          timedOut,
          timeoutMs: taskTimeoutMs,
          stdout,
          stderr,
        });
        logWritten = true;
      } catch {
        // Ignore log write errors
      }
    }

    // Cursor Agent auth failures (common on first run)
    if (exitCode !== 0 && /(not logged in|authentication required)/i.test(combined)) {
      return {
        ok: false,
        message:
          "Cursor Agent is not authenticated. Run `cursor agent login` (interactive) or set CURSOR_API_KEY, then retry.",
      };
    }

    if (exitCode === 0) {
      return {
        ok: true,
        message: `Cursor Agent completed task "${task.id}" (iteration ${iteration})`,
      };
    }

    // Handle timeout explicitly
    if (timedOut || (exitCode === 143 && !combined)) {
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
      message: `Cursor Agent exited with code ${exitCode}: ${
        combined || "(no output)"
      }${
        exitCode === 143
          ? " (process was terminated; may indicate a crash or external kill signal)"
          : ""
      }`.slice(
        0,
        2000
      ),
    };
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
