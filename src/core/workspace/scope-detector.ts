import { minimatch } from "minimatch";
import type { TaskSpec } from "../spec/types";

export type ScopeViolation = {
  file?: string;
  message: string;
};

function matchesAny(file: string, globs: string[]): boolean {
  return globs.some((g) => minimatch(file, g, { dot: true }));
}

export function detectScopeViolations(args: {
  task: TaskSpec;
  changedFiles: Array<{ file: string; isNew: boolean }>;
}): ScopeViolation[] {
  const intent = args.task.sprint?.intent;
  if (!intent) return [];

  // If a file contract exists, use it as the primary scope boundary.
  const allowed = args.task.filesContract?.allowed ?? [];

  // Very small "fix" tasks should stay tight.
  const maxFiles =
    intent === "fix" ? 5 : intent === "feature" ? 20 : intent === "infra" ? 50 : Infinity;

  const violations: ScopeViolation[] = [];
  if (args.changedFiles.length > maxFiles) {
    violations.push({
      message: `Scope violation: "${intent}" intent changed ${args.changedFiles.length} files (max ${maxFiles}).`,
    });
  }

  if (intent === "fix" && allowed.length) {
    for (const cf of args.changedFiles) {
      if (!matchesAny(cf.file, allowed)) {
        violations.push({
          file: cf.file,
          message: `Scope violation: "${intent}" intent changed file outside allowed scope: ${cf.file}`,
        });
      }
    }
  }

  return violations;
}

