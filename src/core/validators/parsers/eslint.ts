import type { Issue } from "../types";

type EslintJson = Array<{
  filePath: string;
  messages: Array<{
    ruleId: string | null;
    severity: 1 | 2;
    message: string;
    line: number;
    column: number;
  }>;
}>;

export function parseEslintOutput(output: string): Issue[] {
  const trimmed = output.trim();
  if (!trimmed) return [];

  try {
    const json = JSON.parse(trimmed) as EslintJson;
    const issues: Issue[] = [];
    for (const file of json) {
      for (const m of file.messages ?? []) {
        issues.push({
          kind: "eslint",
          level: m.severity === 1 ? "warning" : "error",
          message: `${m.message}${m.ruleId ? ` (${m.ruleId})` : ""}`,
          file: file.filePath,
          line: m.line,
          raw: m,
        });
      }
    }
    return issues;
  } catch {
    return [
      {
        kind: "eslint",
        level: "error",
        message: trimmed.slice(0, 4000),
      },
    ];
  }
}

