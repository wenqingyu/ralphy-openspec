# Spec: Engine Core (Ralph Loop State Machine)

## Domain
Core / Engine

## ADDED Requirements

### Requirement: Phase State Machine
The engine MUST implement the following phases: PLAN → PREP → EXEC → VALIDATE → DIAGNOSE → REPAIR → CHECKPOINT → DONE.

#### Scenario: Normal task completion
- GIVEN a task with passing validators
- WHEN the engine processes the task
- THEN it MUST transition: PLAN → PREP → EXEC → VALIDATE → DIAGNOSE → CHECKPOINT → DONE

#### Scenario: Repair loop on validation failure
- GIVEN a task with failing validators
- WHEN DIAGNOSE determines issues are fixable
- AND iterations remain within budget
- THEN it MUST transition to REPAIR
- AND REPAIR MUST re-run EXEC with repair tickets

#### Scenario: Stuck detection
- GIVEN the same issue signature persists for 3+ iterations
- WHEN DIAGNOSE evaluates progress
- THEN it MUST flag "stuck" status
- AND it MUST either auto-split or stop with human action summary

### Requirement: Task Selection
The engine MUST select tasks in topological order respecting dependencies.

#### Scenario: Task with unmet dependencies
- GIVEN task B depends on task A
- WHEN task A is not DONE
- THEN task B MUST NOT be selected for execution

#### Scenario: Priority weighting
- GIVEN multiple runnable tasks with different priorities
- WHEN selecting next task
- THEN higher priority tasks SHOULD be selected first

### Requirement: Stop Conditions
The engine MUST stop immediately when hard limits are exceeded.

#### Scenario: Budget exhausted
- GIVEN run budget `money_usd: 20` and current spend `$19.50`
- WHEN next backend call estimates `$1.00`
- THEN engine MUST stop with exit code 2 (budget limit)

#### Scenario: Max iterations reached
- GIVEN task `max_iterations: 12` and current iteration 12
- WHEN REPAIR would start iteration 13
- THEN engine MUST stop task with exit code 3

### Requirement: Degrade Mode
The engine MUST apply degrade actions when soft limits are approached.

#### Scenario: Budget at 80%
- GIVEN `degrade.when_over_pct: 0.8` and spend at 82%
- WHEN degrade is triggered
- THEN it MUST apply actions in order:
  - Switch to "cheap" model tier
  - Shrink context pack
  - Disable self-review

## Phase Definitions

| Phase | Description | Next Phase |
|-------|-------------|------------|
| PLAN | Select next runnable task | PREP |
| PREP | Load task spec, prepare context pack | EXEC |
| EXEC | Call backend adapter to implement | VALIDATE |
| VALIDATE | Run task validators in parallel | DIAGNOSE |
| DIAGNOSE | Analyze issues, decide pass/fail/repair | CHECKPOINT or REPAIR |
| REPAIR | Generate repair tickets, retry | EXEC |
| CHECKPOINT | Commit/patch checkpoint, mark done | PLAN (next task) or DONE |
| DONE | All tasks complete, generate report | (terminal) |

## Acceptance Criteria

- [ ] All phases implemented with clear transitions
- [ ] Stop conditions enforced at run and task level
- [ ] Degrade mode applies actions correctly
- [ ] Stuck detection triggers after configurable iterations
