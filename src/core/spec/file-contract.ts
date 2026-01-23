import { minimatch } from "minimatch";
import type { FileContract } from "./types";

export type ContractViolation = {
  file: string;
  reason: "forbidden" | "not_allowed" | "new_file_disallowed";
};

export function evaluateFileContract(args: {
  changedFiles: Array<{ file: string; isNew: boolean }>;
  contract: FileContract;
}): ContractViolation[] {
  const { changedFiles, contract } = args;

  const allowed = contract.allowed ?? [];
  const forbidden = contract.forbidden ?? [];
  const allowNewFiles = contract.allowNewFiles ?? true;

  const violations: ContractViolation[] = [];

  for (const { file, isNew } of changedFiles) {
    if (isNew && !allowNewFiles) {
      violations.push({ file, reason: "new_file_disallowed" });
      continue;
    }

    if (forbidden.some((pat) => minimatch(file, pat, { dot: true }))) {
      violations.push({ file, reason: "forbidden" });
      continue;
    }

    if (allowed.length) {
      const ok = allowed.some((pat) => minimatch(file, pat, { dot: true }));
      if (!ok) {
        violations.push({ file, reason: "not_allowed" });
      }
    }
  }

  return violations;
}

