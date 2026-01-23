import type { SprintIntent, SprintSize, TaskBudget } from "./types";

/**
 * Default sprint size -> default budgets (USD + max iterations).
 *
 * These are project defaults. Users SHOULD be able to override at the project-spec level
 * in the future; keep this mapping centralized to avoid hard-coding across the engine.
 */
export const SPRINT_SIZE_DEFAULTS: Record<SprintSize, TaskBudget> = {
  XS: {
    optimal: { usd: 0.2 },
    warning: { usd: 0.35 },
    hard: { usd: 0.5, maxIterations: 3 },
  },
  S: {
    optimal: { usd: 0.5 },
    warning: { usd: 0.8 },
    hard: { usd: 1.2, maxIterations: 5 },
  },
  M: {
    optimal: { usd: 1.2 },
    warning: { usd: 2.0 },
    hard: { usd: 3.0, maxIterations: 8 },
  },
  L: {
    optimal: { usd: 2.5 },
    warning: { usd: 4.0 },
    hard: { usd: 6.0, maxIterations: 12 },
  },
  XL: {
    optimal: { usd: 5.0 },
    warning: { usd: 8.0 },
    hard: { usd: 12.0, maxIterations: 20 },
  },
};

export type SprintIntentConstraints = {
  refactorAllowed: "none" | "limited" | "full";
  checkpointEveryIterations: number;
  validatorStrictness: "high" | "medium";
};

export const SPRINT_INTENT_CONSTRAINTS: Record<SprintIntent, SprintIntentConstraints> = {
  fix: { refactorAllowed: "none", checkpointEveryIterations: 1, validatorStrictness: "high" },
  feature: {
    refactorAllowed: "limited",
    checkpointEveryIterations: 2,
    validatorStrictness: "medium",
  },
  refactor: { refactorAllowed: "full", checkpointEveryIterations: 1, validatorStrictness: "high" },
  infra: { refactorAllowed: "full", checkpointEveryIterations: 1, validatorStrictness: "medium" },
};

export function mergeBudgetDefaults(existing: TaskBudget | undefined, defaults: TaskBudget): TaskBudget {
  const out: TaskBudget = { ...existing };
  out.optimal = { ...defaults.optimal, ...(existing?.optimal ?? {}) };
  out.warning = { ...defaults.warning, ...(existing?.warning ?? {}) };
  out.hard = { ...defaults.hard, ...(existing?.hard ?? {}) };
  return out;
}

