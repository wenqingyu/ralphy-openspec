import type { BudgetStatus } from "../budgets/tiers";
import { aggregateSpend, extractSpendFromLedger, formatSpendReport } from "./spend";

export type FailureSummaryIssue = {
  level?: string;
  kind?: string;
  message: string;
  file?: string;
};

export type FailureSummaryInput = {
  runId: string;
  taskId: string;
  reason: string;
  tier?: "optimal" | "warning" | "hard";
  budgetStatus?: BudgetStatus | null;
  lastIssues?: FailureSummaryIssue[] | null;
  ledgerEvents?: Array<{ taskId?: string; kind: string; data?: unknown }> | null;
  suggestedSteps?: string[] | null;
};

export function buildFailureSummary(input: FailureSummaryInput): string {
  const lines: string[] = [];

  lines.push(`# Task blocked`);
  lines.push(``);
  lines.push(`- **runId**: \`${input.runId}\``);
  lines.push(`- **taskId**: \`${input.taskId}\``);
  lines.push(`- **reason**: ${input.reason}`);
  if (input.tier) lines.push(`- **tier**: ${input.tier}`);
  lines.push(``);

  if (input.budgetStatus) {
    const s = input.budgetStatus;
    lines.push(`## Budget status`);
    lines.push(``);
    lines.push(`- **tier**: ${s.tier}`);
    lines.push(`- **used**: $${s.usedUsd.toFixed(4)}, ${s.usedTokens.toLocaleString()} tokens, ${s.usedIterations} iterations`);
    lines.push(`- **hard cap**: ${s.isAtHardCap ? "YES" : "no"}`);
    lines.push(``);
  }

  if (input.lastIssues && input.lastIssues.length) {
    lines.push(`## Last issues`);
    lines.push(``);
    for (const issue of input.lastIssues.slice(0, 50)) {
      const meta: string[] = [];
      if (issue.level) meta.push(issue.level);
      if (issue.kind) meta.push(issue.kind);
      if (issue.file) meta.push(issue.file);
      const prefix = meta.length ? `[${meta.join(" / ")}] ` : "";
      lines.push(`- ${prefix}${issue.message}`);
    }
    lines.push(``);
  }

  if (input.ledgerEvents && input.ledgerEvents.length) {
    const entries = extractSpendFromLedger(input.ledgerEvents);
    if (entries.length) {
      lines.push(`## Spend breakdown`);
      lines.push(``);
      lines.push(formatSpendReport(aggregateSpend(entries)));
      lines.push(``);
    }
  }

  lines.push(`## Suggested manual steps`);
  lines.push(``);
  const steps =
    input.suggestedSteps?.length
      ? input.suggestedSteps
      : [
          "Inspect recent validator output and fix the first failing error.",
          "Re-run validators locally until green.",
          "If this is a scope issue, narrow the task or adjust the file contract/sprint settings.",
        ];
  for (const step of steps) lines.push(`- ${step}`);
  lines.push(``);

  return lines.join("\n");
}

