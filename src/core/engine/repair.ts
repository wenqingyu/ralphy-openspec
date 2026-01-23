import type { Issue } from "../validators/types";

export function buildRepairNotes(args: {
  tier: "optimal" | "warning" | "hard";
  issues: Issue[];
}): string {
  const lines: string[] = [];

  lines.push(`# Repair notes`);
  lines.push(``);

  if (args.tier === "warning") {
    lines.push(`## Constraints (WARNING tier)`);
    lines.push(`- Fix only failing validators`);
    lines.push(`- Do NOT refactor unrelated code`);
    lines.push(`- Do NOT add new features`);
    lines.push(``);
  }

  lines.push(`## Issues`);
  for (const i of args.issues) {
    const loc = i.file ? `${i.file}${i.line ? `:${i.line}` : ""}` : "";
    lines.push(`- [${i.level}] ${i.kind}${loc ? ` (${loc})` : ""}: ${i.message}`);
  }
  lines.push(``);

  return lines.join("\n");
}

