import fs from "node:fs/promises";
import path from "node:path";

export async function writeBackendLog(args: {
  logFile: string;
  backendId: string;
  cwd: string;
  command: string;
  argv: string[];
  startedAt: string;
  finishedAt: string;
  exitCode: number | null;
  timedOut?: boolean;
  timeoutMs?: number;
  stdout?: string;
  stderr?: string;
}): Promise<void> {
  const dir = path.dirname(args.logFile);
  await fs.mkdir(dir, { recursive: true });

  const max = 200_000; // keep artifacts bounded
  const trim = (s: string) => (s.length > max ? s.slice(0, max) + "\n\n[...truncated...]\n" : s);

  const durationMs = new Date(args.finishedAt).getTime() - new Date(args.startedAt).getTime();
  const durationSec = Math.floor(durationMs / 1000);

  const out = [
    `# Backend log`,
    ``,
    `- startedAt: ${args.startedAt}`,
    `- finishedAt: ${args.finishedAt}`,
    `- duration: ${durationSec}s (${Math.floor(durationMs)}ms)`,
    `- backend: ${args.backendId}`,
    `- cwd: ${args.cwd}`,
    `- command: ${args.command}`,
    `- argv: ${JSON.stringify(args.argv)}`,
    `- exitCode: ${args.exitCode ?? "null"}`,
    ...(args.timedOut !== undefined ? [`- timedOut: ${args.timedOut}`] : []),
    ...(args.timeoutMs !== undefined
      ? [`- timeoutMs: ${args.timeoutMs} (${Math.floor(args.timeoutMs / 60_000)} minutes)`]
      : []),
    ``,
    `## stdout`,
    ``,
    args.stdout ? "```" : "(empty)",
    ...(args.stdout ? [trim(args.stdout), "```"] : []),
    ``,
    `## stderr`,
    ``,
    args.stderr ? "```" : "(empty)",
    ...(args.stderr ? [trim(args.stderr), "```"] : []),
    ``,
  ].join("\n");

  await fs.writeFile(args.logFile, out, "utf8");
}

