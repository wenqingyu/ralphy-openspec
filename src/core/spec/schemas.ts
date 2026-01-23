import { z } from "zod";
import type { FileContract, ProjectSpec, TaskSpec } from "./types";

const toNumber = (v: unknown): number | undefined => {
  if (v === null || v === undefined) return undefined;
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
};

const fileContractSchema = z
  .object({
    allowed: z.array(z.string()).default([]),
    forbidden: z.array(z.string()).default([]),
    allow_new_files: z.boolean().optional(),
    allowNewFiles: z.boolean().optional(),
  })
  .transform((v): FileContract => ({
    allowed: v.allowed ?? [],
    forbidden: v.forbidden ?? [],
    allowNewFiles: v.allowNewFiles ?? v.allow_new_files ?? true,
  }));

const budgetTierSchema = z
  .object({
    usd: z.any().optional(),
    tokens: z.any().optional(),
    time_minutes: z.any().optional(),
    timeMinutes: z.any().optional(),
    max_iterations: z.any().optional(),
    maxIterations: z.any().optional(),
  })
  .transform((v) => ({
    usd: toNumber(v.usd),
    tokens: toNumber(v.tokens),
    timeMinutes: toNumber(v.timeMinutes ?? v.time_minutes),
    maxIterations: toNumber(v.maxIterations ?? v.max_iterations),
  }));

const hardBudgetTierSchema = z
  .object({
    usd: z.any().optional(),
    tokens: z.any().optional(),
    time_minutes: z.any().optional(),
    timeMinutes: z.any().optional(),
    max_iterations: z.any(),
    maxIterations: z.any().optional(),
  })
  .transform((v) => ({
    usd: toNumber(v.usd),
    tokens: toNumber(v.tokens),
    timeMinutes: toNumber(v.timeMinutes ?? v.time_minutes),
    maxIterations: toNumber(v.maxIterations ?? v.max_iterations),
  }))
  .refine((v) => typeof v.maxIterations === "number" && Number.isFinite(v.maxIterations), {
    message: "hard.max_iterations is required",
  });

const taskBudgetSchema = z
  .object({
    optimal: budgetTierSchema.optional(),
    warning: budgetTierSchema.optional(),
    hard: hardBudgetTierSchema.optional(),
  })
  .partial();

const taskSchema = z
  .object({
    id: z.string().min(1),
    title: z.string().optional(),
    goal: z.string().optional(),
    deps: z.array(z.string()).optional(),
    priority: z.number().optional(),
    validators: z.array(z.string()).optional(),
    files_contract: fileContractSchema.optional(),
    filesContract: fileContractSchema.optional(),
    budget: taskBudgetSchema.optional(),
    sprint: z
      .object({
        size: z.enum(["XS", "S", "M", "L", "XL"]).optional(),
        intent: z.enum(["fix", "feature", "refactor", "infra"]).optional(),
      })
      .optional(),
  })
  .transform((v): TaskSpec => ({
    id: v.id,
    title: v.title,
    goal: v.goal,
    deps: v.deps,
    priority: v.priority,
    validators: v.validators,
    filesContract: (v.filesContract ?? v.files_contract) as FileContract | undefined,
    budget: v.budget,
    sprint: v.sprint,
  }));

const validatorSchema = z
  .object({
    id: z.string().min(1),
    run: z.string().min(1),
    timeout_seconds: z.any().optional(),
    timeoutSeconds: z.any().optional(),
    parser: z.string().optional(),
  })
  .transform((v) => ({
    id: v.id,
    run: v.run,
    timeoutSeconds: toNumber(v.timeoutSeconds ?? v.timeout_seconds),
    parser: v.parser,
  }));

const projectSchema = z.object({
  name: z.string().default("my-project"),
  repoRoot: z.string().default("."),
  language: z.string().optional(),
  packageManager: z.string().optional(),
});

const defaultsSchema = z
  .object({
    backend: z.string().default("cursor"),
    workspaceMode: z.enum(["worktree", "patch"]).default("patch"),
    checkpointMode: z.enum(["commit", "patch"]).default("commit"),
    validators: z.array(z.string()).default([]),
  })
  .partial()
  .transform((v) => ({
    backend: v.backend ?? "cursor",
    workspaceMode: v.workspaceMode ?? "patch",
    checkpointMode: v.checkpointMode ?? "commit",
    validators: v.validators ?? [],
  }));

const policiesSchema = z
  .object({
    scopeGuard: z.enum(["off", "warn", "block"]).optional(),
  })
  .partial()
  .optional();

const budgetsSchema = z
  .object({
    run: z
      .object({
        money_usd: z.any().optional(),
        moneyUsd: z.any().optional(),
        tokens: z.any().optional(),
        wall_time_minutes: z.any().optional(),
        wallTimeMinutes: z.any().optional(),
        max_iterations_total: z.any().optional(),
        maxIterationsTotal: z.any().optional(),
      })
      .optional(),
    limits: z
      .object({
        max_parallel_tasks: z.any().optional(),
        maxParallelTasks: z.any().optional(),
        max_parallel_validators: z.any().optional(),
        maxParallelValidators: z.any().optional(),
        command_timeout_seconds: z.any().optional(),
        commandTimeoutSeconds: z.any().optional(),
      })
      .optional(),
  })
  .optional()
  .transform((v) => {
    if (!v) return undefined;
    return {
      run: v.run
        ? {
            moneyUsd: toNumber(v.run.moneyUsd ?? v.run.money_usd),
            tokens: toNumber(v.run.tokens),
            wallTimeMinutes: toNumber(v.run.wallTimeMinutes ?? v.run.wall_time_minutes),
            maxIterationsTotal: toNumber(
              v.run.maxIterationsTotal ?? v.run.max_iterations_total
            ),
          }
        : undefined,
      limits: v.limits
        ? {
            maxParallelTasks: toNumber(
              v.limits.maxParallelTasks ?? v.limits.max_parallel_tasks
            ),
            maxParallelValidators: toNumber(
              v.limits.maxParallelValidators ?? v.limits.max_parallel_validators
            ),
            commandTimeoutSeconds: toNumber(
              v.limits.commandTimeoutSeconds ?? v.limits.command_timeout_seconds
            ),
          }
        : undefined,
    };
  });

const artifactsSchema = z
  .object({
    enabled: z.boolean().optional(),
    rootDir: z.string().optional(),
    statusIcons: z.enum(["emoji", "ascii", "none"]).optional(),
  })
  .optional();

const sprintDefaultsSchema = z
  .object({
    XS: taskBudgetSchema.optional(),
    S: taskBudgetSchema.optional(),
    M: taskBudgetSchema.optional(),
    L: taskBudgetSchema.optional(),
    XL: taskBudgetSchema.optional(),
  })
  .partial()
  .optional();

const backendsSchema = z.record(
  z.string(),
  z.object({
    command: z.string(),
    modelTiers: z.record(z.string(), z.record(z.string(), z.unknown())).optional(),
  })
);

export const projectSpecSchema = z
  .object({
    version: z.string().default("1.0"),
    project: projectSchema.default({ name: "my-project", repoRoot: "." }),
    defaults: defaultsSchema.default({
      backend: "cursor",
      workspaceMode: "patch",
      checkpointMode: "commit",
      validators: [],
    }),
    policies: policiesSchema,
    sprint_defaults: sprintDefaultsSchema,
    sprintDefaults: sprintDefaultsSchema,
    budgets: budgetsSchema,
    backends: backendsSchema.optional(),
    validators: z.array(validatorSchema).optional(),
    tasks: z.array(taskSchema).default([]),
    artifacts: artifactsSchema,
  })
  .transform((v): ProjectSpec => ({
    version: v.version,
    project: v.project,
    defaults: v.defaults,
    policies: v.policies,
    sprintDefaults: v.sprintDefaults ?? v.sprint_defaults,
    budgets: v.budgets,
    backends: v.backends,
    validators: v.validators,
    tasks: v.tasks,
    artifacts: v.artifacts,
  }));

