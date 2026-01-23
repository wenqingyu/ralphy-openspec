# Spec: Three-Tier Budget Model

## Domain
Core / Budgets

## MODIFIED Requirements

### Requirement: Budget State Tracking (UPGRADED)
The system MUST track budget state with three tiers: optimal, warning, hard.

#### Scenario: Task within optimal range
- GIVEN task budget `optimal_usd: 1.2, warning_usd: 2.0, hard_usd: 3.0`
- WHEN current spend is `$0.80`
- THEN budget status MUST be `OPTIMAL`
- AND all features remain enabled

#### Scenario: Task enters warning range
- GIVEN task budget `optimal_usd: 1.2, warning_usd: 2.0, hard_usd: 3.0`
- WHEN current spend reaches `$1.25`
- THEN budget status MUST transition to `WARNING`
- AND degrade behaviors MUST be triggered

#### Scenario: Task hits hard cap
- GIVEN task budget `hard_usd: 3.0`
- WHEN current spend reaches `$3.00`
- THEN task MUST stop immediately
- AND task status MUST be `BLOCKED`
- AND no silent retries allowed

## ADDED Requirements

### Requirement: Budget Metrics Are Independent and Optional
The system MUST support budgets across multiple independent metrics: money, tokens, wall time, iterations.

#### Scenario: Backend has no reliable USD pricing
- GIVEN a backend does not provide reliable `costUsd`
- WHEN usage is recorded
- THEN the system MUST still enforce tokens/time/iteration limits
- AND money-based tiers MUST be computed only if money usage is known or configured
- AND UI/artifacts MUST clearly label estimates vs unknowns

#### Scenario: Tokens-only budget
- GIVEN a task budget that only specifies tokens and max iterations
- WHEN the task runs
- THEN warning/hard tier MUST still be computed based on tokens usage

### Requirement: Degrade Behaviors in Warning Range
The system MUST apply degrade behaviors when task enters warning range.

#### Scenario: Context shrink triggered
- GIVEN task in `WARNING` budget status
- WHEN next iteration context is built
- THEN it MUST apply the configured context reduction strategy
- AND the strategy MUST be configurable (see `DegradePolicy`)
- AND the default strategy SHOULD prioritize failing validator output and issue-referenced files

#### Scenario: Repair-only mode enabled
- GIVEN task in `WARNING` budget status
- WHEN backend prompt is generated
- THEN it MUST include:
  - "Fix only failing validators"
  - "Do NOT refactor unrelated code"
  - "Do NOT add new features"

#### Scenario: Optional calls disabled
- GIVEN task in `WARNING` budget status
- WHEN iteration runs
- THEN self-review calls MUST be skipped
- AND planning regeneration MUST be skipped

### Requirement: Hard Cap Behavior
The system MUST handle hard cap gracefully without silent retries.

#### Scenario: Task blocked on hard cap
- GIVEN task hits hard cap
- WHEN task stops
- THEN it MUST:
  - Preserve workspace (do NOT revert)
  - Write failure summary to `STATUS.md`
  - Write spend breakdown to `BUDGET.md`
  - Write suggested manual steps
  - Mark task as `BLOCKED` in database

#### Scenario: No runaway loops
- GIVEN task at hard cap
- WHEN engine tries to start another iteration
- THEN it MUST throw `BudgetExhaustedError`
- AND iteration MUST NOT start

## TypeScript Schema

```typescript
export type BudgetTier = "optimal" | "warning" | "hard";

export type BudgetMetric = "money" | "tokens" | "time" | "iterations";

export type TaskBudgetConfig = {
  // Each tier MAY specify any subset of metrics.
  // Missing metrics MUST NOT be treated as zero; they are "not enforced".
  optimal: { usd?: number; tokens?: number; timeMinutes?: number };
  warning: { usd?: number; tokens?: number; timeMinutes?: number };
  hard: {
    usd?: number;
    tokens?: number;
    timeMinutes?: number;
    maxIterations: number; // required (hard stop by iteration is always available)
  };
};

export type BudgetStatus = {
  tier: BudgetTier;
  usedUsd: number;
  usedTokens: number;
  usedTimeMs: number;
  usedIterations: number;
  
  // Computed
  // Percent fields MUST be `null` when the corresponding tier metric is not defined.
  usdPctOfOptimal: number | null;
  usdPctOfHard: number | null;
  tokensPctOfOptimal: number | null;
  tokensPctOfHard: number | null;
  timePctOfOptimal: number | null;
  timePctOfHard: number | null;
  isInWarning: boolean;
  isAtHardCap: boolean;
};

export interface BudgetManager {
  getTier(scope: "run" | "task"): BudgetTier;
  
  shouldApplyDegrade(): boolean;
  
  shouldStop(): boolean;
  
  recordUsage(event: UsageEvent): void;
  
  getStatus(): BudgetStatus;
}
```

## Budget Tier Thresholds

Default calculation:
- Budget tiers MUST be computed per metric that is configured.
- Overall tier MUST be the maximum tier across configured metrics (e.g. tokens in WARNING while USD unknown => overall WARNING).
- **OPTIMAL**: for all configured metrics, `used < optimal`
- **WARNING**: for any configured metric, `optimal <= used < hard`
- **HARD**: for any configured metric, `used >= hard` OR `usedIterations >= hard.maxIterations`

## Degrade Actions (Applied in Order)

Degrade actions MUST be configured (project-level defaults, per-task override). The system MUST NOT hard-code a single degrade sequence.

Default actions (recommended):
1. `shrink_context` - Reduce context to essential files only
2. `repair_only_mode` - Disable refactoring, focus on fixes
3. `disable_self_review` - Skip optional review calls
4. `switch_tier_cheap` - Use cheaper model tier (if not already)

## Acceptance Criteria

- [ ] Three budget tiers tracked correctly
- [ ] WARNING triggers all degrade behaviors
- [ ] HARD stops task immediately
- [ ] No silent retries after hard cap
- [ ] BudgetStatus computed accurately
