import type { Issue, ValidateResult } from "../validators/types";

export type ContextPack = {
  text: string;
  size: "full" | "warning_shrunk";
};

export function buildContextPack(args: {
  tier: "optimal" | "warning" | "hard";
  taskId: string;
  validatorResults: Record<string, ValidateResult>;
  issues: Issue[];
}): ContextPack {
  const failing = Object.entries(args.validatorResults).filter(([, r]) => !r.ok);
  const issueFiles = [...new Set(args.issues.map((i) => i.file).filter(Boolean))] as string[];

  if (args.tier !== "warning") {
    return {
      size: "full",
      text: [
        `# Context`,
        ``,
        `Task: ${args.taskId}`,
        ``,
        `## Validator summary`,
        ...Object.entries(args.validatorResults).map(
          ([id, r]) => `- ${id}: ${r.ok ? "OK" : "FAIL"} (exit=${r.exitCode ?? "?"})`
        ),
        ``,
      ].join("\n"),
    };
  }

  // Warning tier: include only failing validator output + referenced files list.
  const shrunk = [
    `# Context (WARNING: shrunk)`,
    ``,
    `Task: ${args.taskId}`,
    ``,
    `## Failing validators`,
    ...(failing.length
      ? failing.map(([id, r]) => {
          const combined = [r.stdout, r.stderr].filter(Boolean).join("\n").trim();
          return [
            `### ${id}`,
            combined ? "```" : "(no output)",
            ...(combined ? [combined.slice(0, 8000), "```"] : []),
            ``,
          ].join("\n");
        })
      : ["(none)", ""]),
    `## Issue files (hints)`,
    ...(issueFiles.length ? issueFiles.map((f) => `- ${f}`) : ["(none)"]),
    ``,
  ].join("\n");

  return { size: "warning_shrunk", text: shrunk };
}

