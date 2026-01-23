# Spec: Budget Management

## Domain
Core / Budgets

## ADDED Requirements

### Requirement: Budget State Tracking
The system MUST track budget state at run and task levels.

#### Scenario: Run-level budget tracking
- GIVEN run budget `money_usd: 20, tokens: 2000000`
- WHEN a backend call uses `$0.50` and `10000 tokens`
- THEN `usedMoneyUsd` MUST increment to `$0.50`
- AND `usedTokens` MUST increment to `10000`

#### Scenario: Task-level budget tracking
- GIVEN task budget `max_iterations: 12`
- WHEN task completes iteration 5
- THEN `usedIterations` MUST be `5`
- AND task MUST continue if under limit

### Requirement: Preflight Checks
The system MUST check budgets before expensive operations.

#### Scenario: Preflight passes
- GIVEN remaining budget allows estimated cost
- WHEN `preflightOrThrow("task", plannedCost)` is called
- THEN it MUST NOT throw
- AND execution MUST proceed

#### Scenario: Preflight fails
- GIVEN remaining budget is less than estimated cost
- WHEN `preflightOrThrow("run", plannedCost)` is called
- THEN it MUST throw `BudgetExhaustedError`
- AND execution MUST NOT proceed

### Requirement: Usage Recording
The system MUST record all usage events to the ledger.

#### Scenario: Backend call usage
- GIVEN a backend call completes with token usage
- WHEN `recordUsage(event)` is called
- THEN a ledger event MUST be appended
- AND the event MUST include `tokensTotal`, `costUsd`, `isEstimated`

### Requirement: Degrade Policy
The system MUST apply degrade actions when thresholds are reached.

#### Scenario: Degrade triggers tier switch
- GIVEN `degrade.when_over_pct: 0.8` and spend at 85%
- WHEN `shouldDegrade()` returns true
- AND `applyDegrade(policy)` is called
- THEN model tier MUST switch to "cheap"
- AND a `budget_degrade_applied` event MUST be logged

## TypeScript Interface

```typescript
export type BudgetState = {
  moneyUsd?: number;
  tokens?: number;
  wallTimeMs?: number;
  maxIterations?: number;

  usedMoneyUsd: number;
  usedTokens: number;
  usedWallTimeMs: number;
  usedIterations: number;
};

export type BudgetContext = {
  run: BudgetState;
  task: BudgetState;
  limits: {
    maxParallelTasks: number;
    maxParallelValidators: number;
    commandTimeoutSeconds: number;
  };
  degrade: {
    whenOverPct: number;
    actions: DegradeAction[];
  };
};

export interface BudgetManager {
  preflightOrThrow(scope: "run" | "task", cost: PlannedCost): void;
  recordUsage(event: UsageEvent): void;
  shouldDegrade(): boolean;
  applyDegrade(policy: DegradePolicy): void;
  getContext(): BudgetContext;
}
```

## Acceptance Criteria

- [ ] Budget state tracked accurately at run and task levels
- [ ] Preflight checks prevent over-budget operations
- [ ] Usage events recorded with timestamps
- [ ] Degrade mode applies all configured actions
