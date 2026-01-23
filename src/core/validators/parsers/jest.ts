import type { Issue } from "../types";

export function parseJestOutput(output: string): Issue[] {
  const trimmed = output.trim();
  if (!trimmed) return [];
  return [
    {
      kind: "jest",
      level: "error",
      message: trimmed.slice(0, 4000),
    },
  ];
}

