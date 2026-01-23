# Spec: Artifact Contract (IDE-Friendly Interface)

## Domain
Artifacts / Human Interface

## ADDED Requirements

### Requirement: Canonical Artifact Files
ralphy-spec MUST maintain these files continuously as the human interface.

#### Scenario: STATUS.md updated on phase change
- GIVEN engine transitions to new phase
- WHEN phase change completes
- THEN `<artifactRoot>/STATUS.md` MUST be updated
- AND it MUST reflect current task, phase, iteration, budgets

#### Scenario: TASKS.md updated on task state change
- GIVEN a task changes state (pending → running → done)
- WHEN state change is persisted
- THEN `<artifactRoot>/TASKS.md` MUST be updated
- AND it MUST show task board view with status icons

#### Scenario: BUDGET.md updated on spend
- GIVEN a backend call completes with spend
- WHEN usage is recorded
- THEN `<artifactRoot>/BUDGET.md` MUST be updated
- AND it MUST show per-task breakdown

### Requirement: Artifact Root and Formats Are Configurable
The artifact system MUST be configurable to avoid hard-coded paths and UI conventions.

#### Scenario: Artifact root overridden
- GIVEN config sets `artifacts.rootDir: ".ralphy-spec"` (or CLI flag `--artifact-dir`)
- WHEN the engine writes artifacts
- THEN it MUST write to the configured root directory
- AND it MUST NOT assume the root is `./ralphy-spec/`

#### Scenario: Artifacts disabled
- GIVEN config sets `artifacts.enabled: false`
- WHEN the engine runs
- THEN it MUST NOT write markdown artifacts
- AND it MUST still persist run state in the database
- AND CLI commands MUST still work via database queries

### Requirement: STATUS.md Structure
STATUS.md MUST follow the canonical format.

#### Scenario: STATUS.md during active run
- GIVEN an active run with task in REPAIR phase
- WHEN STATUS.md is read
- THEN it MUST include:
  - Run metadata (id, start time, backend, workspace mode)
  - Current task and phase
  - Budget summary (used / optimal / hard)
  - Last failure summary
  - Next action (what agent will do)

### Requirement: TASKS.md Structure
TASKS.md MUST show sprint/task board view.

#### Scenario: TASKS.md with mixed task states
- GIVEN run with tasks in various states
- WHEN TASKS.md is read
- THEN it MUST show table with:
  - Task ID, Title, Sprint size
  - Status indicator (icon set MUST be configurable; plain-text fallback MUST be supported)
  - Spend vs budget
  - Iteration count

### Requirement: BUDGET.md Structure
BUDGET.md MUST show spend breakdown.

#### Scenario: BUDGET.md after multiple tasks
- GIVEN run with 3 completed tasks
- WHEN BUDGET.md is read
- THEN it MUST show:
  - Run-level budget summary
  - Per-task breakdown table
  - Warning indicators for over-optimal tasks

### Requirement: Task-Level Artifacts
Each task MUST have dedicated artifact files.

#### Scenario: CONTEXT.md created before backend call
- GIVEN task enters EXEC phase
- WHEN context pack is built
- THEN `<artifactRoot>/tasks/<taskId>/CONTEXT.md` MUST be written
- AND it MUST contain exact context sent to backend

#### Scenario: REPAIR.md created on validation failure
- GIVEN task enters REPAIR phase
- WHEN repair tickets are generated
- THEN `<artifactRoot>/tasks/<taskId>/REPAIR.md` MUST be written
- AND it MUST contain structured repair tickets

### Requirement: Run Log Immutability
Run logs MUST be immutable human-readable records.

#### Scenario: Run log created on run completion
- GIVEN a run completes (success or failure)
- WHEN run is finalized
- THEN `<artifactRoot>/runs/<runId>.md` MUST be created
- AND it MUST contain full timeline of events
- AND it MUST be reproducible from the ledger (re-generation MUST NOT change semantics)

## File Templates

### STATUS.md

```markdown
# ralphy-spec Status

**Run:** 2026-01-23T14:22Z  
**Backend:** cursor (default tier)  
**Workspace:** worktree

---

## Current Task: auth-001
**Phase:** REPAIR (iteration 3/8)

### Budgets
| Metric | Used | Optimal | Hard | Status |
|--------|------|---------|------|--------|
| USD | $0.78 | $1.20 | $3.00 | ✅ OK |
| Tokens | 92k | 80k | 250k | ⚠️ Warning |
| Time | 12m | 10m | 20m | ⚠️ Warning |

### Last Failure
```
test: src/api/auth.test.ts
  expected 401, got 500
  at line 42: expect(res.status).toBe(401)
```

### Next Action
- Fix middleware error handling only
- Do NOT refactor unrelated files
- Focus on: `src/middleware/auth.ts`
```

### TASKS.md

```markdown
# Task Board

**Run:** abc123  
**Progress:** 2/5 tasks done

| Status | Task | Sprint | Used | Budget | Iter |
|--------|------|--------|------|--------|------|
| ✅ | auth-001 | M | $0.78 | $1.20 | 3/8 |
| ✅ | auth-002 | S | $0.45 | $0.50 | 2/5 |
| 🔄 | api-001 | M | $0.32 | $1.20 | 2/8 |
| ⏸ | api-002 | L | — | $2.50 | 0/12 |
| ⏸ | infra-001 | XL | — | $5.00 | 0/20 |

## Legend
- ✅ Done
- 🔄 Running
- ⏸ Pending
- ❌ Blocked
- ⚠️ Warning (over optimal)
```

### BUDGET.md

```markdown
# Budget Overview

## Run Budget
| Metric | Used | Limit | % |
|--------|------|-------|---|
| USD | $4.21 | $20.00 | 21% |
| Tokens | 310k | 2M | 15% |
| Time | 34m | 90m | 38% |

## Task Breakdown
| Task | Sprint | Used | Optimal | Status |
|------|--------|------|---------|--------|
| auth-001 | M | $0.78 | $1.20 | ✅ OK |
| auth-002 | S | $0.62 | $0.50 | ⚠️ Over |
| api-001 | M | $0.32 | $1.20 | ✅ OK |
| infra-001 | L | $1.90 | $2.50 | ✅ OK |

## Spend by Backend
| Backend | Calls | Tokens | USD |
|---------|-------|--------|-----|
| cursor | 12 | 280k | $3.50 |
| validator | 24 | 30k | $0.71 |
```

### tasks/<taskId>/CONTEXT.md

```markdown
# Context: auth-001 (iteration 3)

## Task
**Goal:** Add JWT auth middleware for API routes

## Acceptance Criteria
1. Requests without token return 401
2. Valid tokens allow access
3. Unit tests added

## Constraints
- Allowed: `src/middleware/**`, `src/api/**`
- Forbidden: `src/db/**`
- New files: allowed

## Previous Issues (to fix)
1. `test: expected 401, got 500` in `src/api/auth.test.ts:42`

## Files Included
- `src/middleware/auth.ts` (full)
- `src/api/auth.test.ts` (failing test section)

---
[Full context below...]
```

## TypeScript Interface

```typescript
export interface ArtifactWriter {
  updateStatus(status: RunStatus): Promise<void>;
  updateTasks(tasks: TaskState[]): Promise<void>;
  updateBudget(budget: BudgetSummary): Promise<void>;
  
  writeTaskContext(taskId: string, context: ContextPack): Promise<void>;
  writeTaskRepair(taskId: string, tickets: RepairTicket[]): Promise<void>;
  writeTaskNotes(taskId: string, notes: string): Promise<void>;
  
  finalizeRunLog(runId: string, events: LedgerEvent[]): Promise<void>;
}
```

## Acceptance Criteria

- [ ] STATUS.md updated on every phase change
- [ ] TASKS.md shows accurate task board
- [ ] BUDGET.md shows per-task breakdown
- [ ] Task CONTEXT.md written before each backend call
- [ ] Task REPAIR.md written on validation failure
- [ ] Run logs are immutable after creation
- [ ] All artifacts are human-readable markdown
 - [ ] Artifact root directory configurable (`artifacts.rootDir` / `--artifact-dir`)
 - [ ] Artifacts can be disabled (`artifacts.enabled=false`) without breaking CLI via DB
 - [ ] Status indicators support a plain-text fallback (no emoji hard dependency)
