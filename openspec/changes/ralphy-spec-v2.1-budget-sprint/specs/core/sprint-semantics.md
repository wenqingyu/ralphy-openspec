# Spec: Sprint-Based Task Semantics

## Domain
Core / Sprint

## ADDED Requirements

### Requirement: Sprint Size
Each task MUST have a sprint size that influences default budgets and constraints.

#### Scenario: Sprint size XS
- GIVEN task with `sprint.size: "XS"`
- WHEN no explicit budget is provided
- THEN default budget MUST be:
  - optimal_usd: $0.20
  - warning_usd: $0.35
  - hard_usd: $0.50
  - max_iterations: 3
- AND refactoring MUST be forbidden

#### Scenario: Sprint size M
- GIVEN task with `sprint.size: "M"`
- WHEN no explicit budget is provided
- THEN default budget MUST be:
  - optimal_usd: $1.20
  - warning_usd: $2.00
  - hard_usd: $3.00
  - max_iterations: 8
- AND limited refactoring allowed

#### Scenario: Sprint size XL
- GIVEN task with `sprint.size: "XL"`
- WHEN no explicit budget is provided
- THEN default budget MUST be:
  - optimal_usd: $5.00
  - warning_usd: $8.00
  - hard_usd: $12.00
  - max_iterations: 20
- AND refactoring allowed with frequent checkpoints

### Requirement: Sprint Semantics Are Optional
Sprint semantics MUST be optional to support projects that prefer explicit budgets only.

#### Scenario: Sprint omitted
- GIVEN a task that does not specify `sprint`
- WHEN the task is loaded
- THEN the engine MUST NOT apply sprint defaults
- AND the task MUST rely on explicit `budget` or project-level fallback budgets

### Requirement: Sprint Intent
Each task MUST have an intent that influences behavioral constraints.

#### Scenario: Intent "fix"
- GIVEN task with `sprint.intent: "fix"`
- WHEN engine processes the task
- THEN refactoring MUST be forbidden
- AND checkpoint MUST occur every iteration
- AND validator strictness MUST be high

#### Scenario: Intent "feature"
- GIVEN task with `sprint.intent: "feature"`
- WHEN engine processes the task
- THEN limited refactoring allowed
- AND checkpoint every 2 iterations
- AND validator strictness medium

#### Scenario: Intent "refactor"
- GIVEN task with `sprint.intent: "refactor"`
- WHEN engine processes the task
- THEN refactoring fully allowed
- AND checkpoint every iteration
- AND validator strictness high

### Requirement: Sprint Constraints Enforcement
The engine MUST enforce constraints based on sprint size and intent.

#### Scenario: XS task attempts refactor
- GIVEN task with `sprint.size: "XS"` and `sprint.intent: "fix"`
- WHEN backend produces diff with unrelated changes
- THEN the engine MUST apply the configured scope guard policy
- AND when policy is `block`, it MUST create issue `kind: "scope_violation"` and fail the iteration
- AND when policy is `warn`, it MUST create a warning issue and continue
- AND when policy is `off`, it MUST not create a scope issue

#### Scenario: L task frequent checkpoints
- GIVEN task with `sprint.size: "L"`
- WHEN iteration count reaches checkpoint frequency
- THEN engine MUST create checkpoint
- AND log checkpoint event to ledger

## TypeScript Schema

```typescript
export type SprintSize = "XS" | "S" | "M" | "L" | "XL";

export type SprintIntent = "fix" | "feature" | "refactor" | "infra";

export type SprintConfig = {
  size: SprintSize;
  intent: SprintIntent;
};

export type SprintDefaults = {
  budget: {
    optimal: { usd: number; tokens: number; timeMinutes: number };
    warning: { usd: number; tokens: number; timeMinutes: number };
    hard: { usd: number; tokens: number; timeMinutes: number; maxIterations: number };
  };
  constraints: {
    allowRefactor: boolean;
    refactorScope: "none" | "limited" | "full";
    checkpointFrequency: number;  // every N iterations
    validatorStrictness: "low" | "medium" | "high";
    scopeGuard: "off" | "warn" | "block"; // heuristic, configurable
  };
};

// Default mappings
export const SPRINT_SIZE_DEFAULTS: Record<SprintSize, SprintDefaults["budget"]> = {
  XS: {
    optimal: { usd: 0.20, tokens: 15_000, timeMinutes: 3 },
    warning: { usd: 0.35, tokens: 25_000, timeMinutes: 5 },
    hard: { usd: 0.50, tokens: 40_000, timeMinutes: 8, maxIterations: 3 },
  },
  S: {
    optimal: { usd: 0.50, tokens: 40_000, timeMinutes: 5 },
    warning: { usd: 0.80, tokens: 65_000, timeMinutes: 8 },
    hard: { usd: 1.20, tokens: 100_000, timeMinutes: 12, maxIterations: 5 },
  },
  M: {
    optimal: { usd: 1.20, tokens: 80_000, timeMinutes: 10 },
    warning: { usd: 2.00, tokens: 150_000, timeMinutes: 15 },
    hard: { usd: 3.00, tokens: 250_000, timeMinutes: 20, maxIterations: 8 },
  },
  L: {
    optimal: { usd: 2.50, tokens: 150_000, timeMinutes: 20 },
    warning: { usd: 4.00, tokens: 280_000, timeMinutes: 35 },
    hard: { usd: 6.00, tokens: 450_000, timeMinutes: 50, maxIterations: 12 },
  },
  XL: {
    optimal: { usd: 5.00, tokens: 300_000, timeMinutes: 40 },
    warning: { usd: 8.00, tokens: 550_000, timeMinutes: 70 },
    hard: { usd: 12.00, tokens: 900_000, timeMinutes: 100, maxIterations: 20 },
  },
};

export const SPRINT_INTENT_CONSTRAINTS: Record<SprintIntent, SprintDefaults["constraints"]> = {
  fix: {
    allowRefactor: false,
    refactorScope: "none",
    checkpointFrequency: 1,
    validatorStrictness: "high",
    scopeGuard: "warn",
  },
  feature: {
    allowRefactor: true,
    refactorScope: "limited",
    checkpointFrequency: 2,
    validatorStrictness: "medium",
    scopeGuard: "warn",
  },
  refactor: {
    allowRefactor: true,
    refactorScope: "full",
    checkpointFrequency: 1,
    validatorStrictness: "high",
    scopeGuard: "off",
  },
  infra: {
    allowRefactor: true,
    refactorScope: "full",
    checkpointFrequency: 1,
    validatorStrictness: "medium",
    scopeGuard: "off",
  },
};
```

## Task Schema (Extended)

```yaml
tasks:
  - id: auth-001
    title: "JWT middleware"
    goal: "Add JWT auth middleware for API routes"
    
    sprint:
      size: M                # XS / S / M / L / XL
      intent: "feature"      # fix / feature / refactor / infra
    
    budget:                  # optional, overrides sprint defaults
      optimal:
        usd: 1.2
        tokens: 80_000
        time_minutes: 10
      warning:
        usd: 2.0
        tokens: 150_000
        time_minutes: 15
      hard:
        usd: 3.0
        tokens: 250_000
        time_minutes: 20
        max_iterations: 8
    
    # ... rest of task spec
```

## Acceptance Criteria

- [ ] Sprint size defaults applied when budget not specified
- [ ] Sprint intent constraints enforced
- [ ] XS/S tasks reject refactoring attempts
- [ ] L/XL tasks checkpoint at correct frequency
- [ ] Scope violations detected and reported
 - [ ] Scope/refactor detection is policy-driven (`off` | `warn` | `block`), not hard-coded
 - [ ] Sprint semantics can be disabled by omitting `sprint`
