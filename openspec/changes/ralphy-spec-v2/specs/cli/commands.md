# Spec: CLI Commands

## Domain
CLI / Commands

## MODIFIED Requirements

### Requirement: Init Command (Extended)
The `init` command MUST be extended to support v2 configuration.

#### Scenario: Init creates project.yml
- GIVEN `ralphy-spec init` is run
- WHEN no `openspec/project.yml` exists
- THEN it MUST create a template `project.yml`
- AND include default budgets, validators, and empty tasks

## ADDED Requirements

### Requirement: Run Command
The `run` command MUST execute the engine loop.

#### Scenario: Run all tasks
- GIVEN `ralphy-spec run` with valid project.yml
- WHEN executed
- THEN it MUST load spec, build DAG, and process all tasks
- AND exit with code 0 on success

#### Scenario: Run single task
- GIVEN `ralphy-spec run --task auth-001`
- WHEN executed
- THEN it MUST only run the specified task
- AND skip dependency checks (assume deps are met)

#### Scenario: Dry run
- GIVEN `ralphy-spec run --dry-run`
- WHEN executed
- THEN it MUST validate spec and show execution plan
- AND MUST NOT execute any backend calls

### Requirement: Status Command
The `status` command MUST show run progress.

#### Scenario: Status with active run
- GIVEN an active run in progress
- WHEN `ralphy-spec status` is called
- THEN it MUST show: current task, phase, iteration, elapsed time
- AND budget usage: USD, tokens, wall time
- AND recent ledger events

#### Scenario: Status JSON output
- GIVEN `ralphy-spec status --json`
- WHEN executed
- THEN it MUST output machine-readable JSON
- AND include `runSummary`, `taskSummaries`, `budgetSummary`

### Requirement: Tail Command
The `tail` command MUST stream ledger events.

#### Scenario: Tail active run
- GIVEN an active run
- WHEN `ralphy-spec tail` is called
- THEN it MUST stream new ledger events as they occur
- AND format them for human readability

### Requirement: Validate Command (Extended)
The `validate` command MUST run validators for a task.

#### Scenario: Validate specific task
- GIVEN `ralphy-spec validate --task auth-001`
- WHEN executed
- THEN it MUST run all validators for that task
- AND output structured results

### Requirement: Report Command
The `report` command MUST generate run reports.

#### Scenario: Generate markdown report
- GIVEN `ralphy-spec report --out report.md`
- WHEN a run has completed
- THEN it MUST generate a report with:
  - Overview (start time, duration, outcome)
  - Task results table
  - Spend breakdown by task/backend
  - Validator history
  - Remaining tasks (if stopped early)
  - Human action items (if stuck)

### Requirement: Checkpoint Command
The `checkpoint` command MUST create manual checkpoints.

#### Scenario: Manual checkpoint
- GIVEN `ralphy-spec checkpoint --task auth-001 --message "WIP"`
- WHEN executed
- THEN it MUST create a checkpoint commit/patch
- AND log to the ledger

## CLI Flags

```
ralphy-spec run
  --backend cursor|opencode|claude-code
  --workspace worktree|patch
  --budget-usd <n>
  --token-budget <n>
  --time-limit <e.g. 60m>
  --max-iter <n>
  --task <taskId>
  --dry-run
  --json

ralphy-spec status
  --task <id>
  --json

ralphy-spec tail

ralphy-spec validate
  --task <id>

ralphy-spec report
  --out <filepath>

ralphy-spec checkpoint
  --task <id>
  --message <string>
```

## Exit Codes

| Code | Meaning |
|------|---------|
| 0 | Success - all tasks done |
| 2 | Stopped by budget limit |
| 3 | Stopped by validation stuck / max iterations |
| 4 | Spec invalid |
| 5 | Backend invocation error |
| 6 | Validator infra error (timeouts, missing commands) |

## Acceptance Criteria

- [ ] All commands implemented with flags
- [ ] Exit codes match specification
- [ ] JSON output available for status and report
- [ ] Backward compatible with v1 init
