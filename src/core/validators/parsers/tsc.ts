import type { Issue } from "../types";

// Example:
// src/foo.ts(12,3): error TS2322: Type 'x' is not assignable...
const tscLineRe =
  /^(?<file>[^:(]+)\((?<line>\d+),(?<col>\d+)\):\s+(?<level>error|warning)\s+TS\d+:\s+(?<msg>.*)$/;

export function parseTscOutput(output: string): Issue[] {
  const issues: Issue[] = [];
  for (const line of output.split("\n")) {
    const m = line.match(tscLineRe);
    if (!m?.groups) continue;
    issues.push({
      kind: "tsc",
      level: m.groups.level === "warning" ? "warning" : "error",
      message: m.groups.msg.trim(),
      file: m.groups.file.trim(),
      line: Number(m.groups.line),
      raw: { line },
    });
  }

  // If there is output but no matches, surface a generic issue.
  if (!issues.length && output.trim()) {
    issues.push({
      kind: "tsc",
      level: "error",
      message: output.trim().slice(0, 4000),
    });
  }

  return issues;
}

